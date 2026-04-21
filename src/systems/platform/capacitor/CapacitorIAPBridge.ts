/// <reference types="cordova-plugin-purchase" />
/**
 * Google Play Billing / Apple StoreKit-backed IAPBridge.
 *
 * Wraps `cordova-plugin-purchase` (j3k0), the de-facto cross-platform
 * IAP library for hybrid apps. Capacitor picks up the Cordova plugin
 * during `cap sync` — no Capacitor-native wrapper needed.
 *
 * Lifecycle
 *   1. Construction registers every SKU from our catalogue against the
 *      matching platform (GOOGLE_PLAY on Android, APPLE_APPSTORE on iOS).
 *   2. A `when().approved()` handler applies the transaction to our
 *      owned-set and calls `transaction.finish()` so the store stops
 *      re-emitting it. We do NOT server-verify yet (receipts are trusted
 *      at first-party launch — see the anticheat memo for the plan).
 *   3. `store.initialize()` kicks off product-info fetch + any pending
 *      transaction re-delivery.
 *
 * The `restorePurchases()` method re-triggers delivery and waits a
 * short grace window for `approved` events to flow in before returning
 * the currently-owned SKU list — the RestorePurchases flow function
 * then applies those SKUs to PlayerInventory.
 */
import 'cordova-plugin-purchase';
import type { IAPBridge, ProductInfo, PurchaseResult } from '../PlatformBridge';
import {
  SKU_ADS_OFF,
  SKU_SHARDS_SMALL,
  SKU_SHARDS_MEDIUM,
  SKU_SHARDS_LARGE,
  SKU_SHARDS_MEGA,
  SKU_BATTLE_PASS_S1,
  skinIdToSku,
} from '../Skus';
import { SKIN_DEFS } from '../../monetization/StoreDefinitions';

// Cordova plugins attach to a global when running inside the native
// wrapper. Types come from the triple-slash reference above.
declare const CdvPurchase: typeof globalThis extends { CdvPurchase: infer T } ? T : any;

type PlatformEnum = typeof CdvPurchase.Platform.GOOGLE_PLAY | typeof CdvPurchase.Platform.APPLE_APPSTORE;

/** Build the full catalogue of SKUs we need the store to know about. */
function buildCatalogue(platform: PlatformEnum): CdvPurchase.IRegisterProduct[] {
  const t = CdvPurchase.ProductType;
  const products: CdvPurchase.IRegisterProduct[] = [
    { id: SKU_ADS_OFF,       type: t.NON_CONSUMABLE, platform },
    { id: SKU_SHARDS_SMALL,    type: t.CONSUMABLE,     platform },
    { id: SKU_SHARDS_MEDIUM,   type: t.CONSUMABLE,     platform },
    { id: SKU_SHARDS_LARGE,    type: t.CONSUMABLE,     platform },
    { id: SKU_SHARDS_MEGA,     type: t.CONSUMABLE,     platform },
    { id: SKU_BATTLE_PASS_S1,  type: t.NON_CONSUMABLE, platform },
  ];
  for (const def of SKIN_DEFS) {
    if (def.target !== 'tower_faction' || !def.faction) continue;
    products.push({
      id: skinIdToSku(def.id, def.faction),
      type: t.NON_CONSUMABLE,
      platform,
    });
  }
  return products;
}

export class CapacitorIAPBridge implements IAPBridge {
  private readonly platform: PlatformEnum;
  private readonly ownedNonConsumables = new Set<string>();
  private readonly pendingPurchases = new Map<string, (result: PurchaseResult) => void>();
  private readonly ready: Promise<void>;

  constructor(os: 'android' | 'ios') {
    this.platform = os === 'ios'
      ? CdvPurchase.Platform.APPLE_APPSTORE
      : CdvPurchase.Platform.GOOGLE_PLAY;
    this.ready = this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    const store = CdvPurchase.store;
    store.register(buildCatalogue(this.platform));

    store.when()
      .approved((t: CdvPurchase.Transaction) => {
        for (const p of t.products ?? []) {
          const productId = p.id;
          const product = store.get(productId, this.platform);
          // Only track non-consumables as "owned"; consumables are
          // delivered once and then forgotten on the store side.
          if (product?.type === CdvPurchase.ProductType.NON_CONSUMABLE) {
            this.ownedNonConsumables.add(productId);
          }
          this.resolvePending(productId, {
            status: 'success',
            productId,
            transactionId: t.transactionId ?? undefined,
          });
        }
        // Finish synchronously — we trust first-party launch; server
        // verification is a future phase.
        void t.finish();
      })
      .finished((t: CdvPurchase.Transaction) => {
        // Fallback in case approved didn't resolve for some reason
        // (e.g. already-owned re-emits on some platforms bypass approved).
        for (const p of t.products ?? []) {
          this.resolvePending(p.id, { status: 'success', productId: p.id });
        }
      });

    try {
      await store.initialize([this.platform]);
    } catch (err) {
      console.warn('[iap] initialize failed', err);
    }
  }

  async listProducts(skus: string[]): Promise<Record<string, ProductInfo>> {
    await this.ready;
    const store = CdvPurchase.store;
    const out: Record<string, ProductInfo> = {};
    for (const sku of skus) {
      const p = store.get(sku, this.platform);
      if (!p) continue;
      const offer = p.getOffer();
      const price = offer?.pricingPhases?.[0]?.price ?? '';
      out[sku] = {
        id: sku,
        displayPrice: price,
        title: p.title ?? sku,
        description: p.description ?? '',
        type: p.type === CdvPurchase.ProductType.CONSUMABLE ? 'consumable' : 'non-consumable',
      };
    }
    return out;
  }

  async purchase(sku: string): Promise<PurchaseResult> {
    await this.ready;
    const store = CdvPurchase.store;
    const product = store.get(sku, this.platform);
    if (!product) return { status: 'unavailable', productId: sku };
    const offer = product.getOffer();
    if (!offer) return { status: 'unavailable', productId: sku };

    // Resolve once: approved handler picks up the first transaction for
    // this product; if order() rejects we resolve early.
    return new Promise<PurchaseResult>((resolve) => {
      this.pendingPurchases.set(sku, resolve);
      offer.order().then((err) => {
        if (err) {
          // Distinguish user cancel from other errors so UI can stay quiet.
          const isCancel = err.code === CdvPurchase.ErrorCode.PAYMENT_CANCELLED;
          this.resolvePending(sku, {
            status: isCancel ? 'cancelled' : 'failed',
            productId: sku,
            error: err.message,
          });
        }
      }).catch(() => {
        this.resolvePending(sku, { status: 'failed', productId: sku, error: 'order threw' });
      });
    });
  }

  async restorePurchases(): Promise<string[]> {
    await this.ready;
    const store = CdvPurchase.store;
    try {
      await store.restorePurchases();
    } catch (err) {
      console.warn('[iap] restore failed', err);
      return Array.from(this.ownedNonConsumables);
    }
    // Store re-emits approved events after restore. Give them a short
    // window to settle before reporting the owned set.
    await new Promise<void>(res => setTimeout(res, 1500));
    return Array.from(this.ownedNonConsumables);
  }

  ownsProduct(sku: string): boolean {
    return this.ownedNonConsumables.has(sku);
  }

  private resolvePending(sku: string, result: PurchaseResult): void {
    const fn = this.pendingPurchases.get(sku);
    if (!fn) return;
    this.pendingPurchases.delete(sku);
    fn(result);
  }
}
