"""
Tower-as-neuron v1: Learn tower embeddings and how they combine.

Each tower is a neuron (learned embedding). A build is a set of
towers; attention learns which towers matter. The model predicts
win probability from the build composition.

This learns *patterns* (cheap DPS + shred = good), not *positions*.
"""
import json
import numpy as np
import torch
import torch.nn as nn

class TowerModel(nn.Module):
    def __init__(self, n_towers, feature_dim, embed_dim=32):
        super().__init__()
        # Tower embeddings: learned, initialized from features
        self.tower_embed = nn.Embedding(n_towers, embed_dim)
        # Attention: which towers in the build matter most
        self.attention = nn.Sequential(
            nn.Linear(embed_dim, 16),
            nn.Tanh(),
            nn.Linear(16, 1),
        )
        # Predictor: build representation -> win probability
        self.predictor = nn.Sequential(
            nn.Linear(embed_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.3),
            nn.Linear(32, 1),
        )
    
    def forward(self, tower_ids, counts):
        """
        tower_ids: (batch, max_towers) - tower indices in the build
        counts: (batch, max_towers) - count of each tower
        """
        # Embed towers: (batch, max_towers, embed_dim)
        embeds = self.tower_embed(tower_ids)
        # Weight by count
        embeds = embeds * counts.unsqueeze(-1)
        # Attention weights
        attn_w = torch.softmax(self.attention(embeds).squeeze(-1), dim=1)
        # Weighted sum: (batch, embed_dim)
        build_repr = (embeds * attn_w.unsqueeze(-1)).sum(dim=1)
        # Predict
        return torch.sigmoid(self.predictor(build_repr)).squeeze(-1)

def load_data():
    tower_ids = json.load(open('/tmp/tower_ids.json'))
    tid_to_idx = {tid: i for i, tid in enumerate(tower_ids)}
    tower_vecs = np.load('/tmp/tower_vecs.npy')
    
    alex_builds = json.load(open('/tmp/alex_builds.json'))
    bot_builds = json.load(open('/tmp/bot_builds.json'))
    
    all_builds = []
    for b in alex_builds:
        all_builds.append((b['towers'], 1))
    for b in bot_builds:
        all_builds.append((b['towers'], b['win']))
    
    # Convert to tensors: pad to max towers
    max_towers = max(len(b[0]) for b in all_builds)
    n = len(all_builds)
    
    tower_ids_t = torch.zeros(n, max_towers, dtype=torch.long)
    counts_t = torch.zeros(n, max_towers)
    labels_t = torch.zeros(n)
    
    for i, (towers, win) in enumerate(all_builds):
        for j, (tid, count) in enumerate(towers.items()):
            if tid in tid_to_idx:
                tower_ids_t[i, j] = tid_to_idx[tid]
                counts_t[i, j] = count
        labels_t[i] = win
    
    return tower_ids_t, counts_t, labels_t, tower_vecs, tid_to_idx

def train():
    tower_ids, counts, labels, tower_vecs, tid_to_idx = load_data()
    n_towers = len(tid_to_idx)
    feature_dim = tower_vecs.shape[1]
    
    model = TowerModel(n_towers, feature_dim)
    # Initialize embeddings from features (project to embed_dim)
    with torch.no_grad():
        proj = torch.randn(feature_dim, 32) * 0.1
        model.tower_embed.weight.copy_(torch.from_numpy(tower_vecs).float() @ proj)
    
    opt = torch.optim.Adam(model.parameters(), lr=0.01)
    criterion = nn.BCELoss()
    
    print(f"Training on {len(labels)} builds ({labels.sum().item():.0f} wins)")
    for epoch in range(200):
        model.train()
        opt.zero_grad()
        pred = model(tower_ids, counts)
        loss = criterion(pred, labels)
        loss.backward()
        opt.step()
        if epoch % 50 == 0:
            acc = ((pred > 0.5).float() == labels).float().mean()
            print(f"Epoch {epoch}: loss={loss.item():.4f}, acc={acc.item():.4f}")
    
    # Evaluate
    model.eval()
    with torch.no_grad():
        pred = model(tower_ids, counts)
        acc = ((pred > 0.5).float() == labels).float().mean()
        print(f"\nFinal acc: {acc.item():.4f}")
        # Show predictions for Alex's builds
        print("\nAlex builds (should be ~1.0):")
        for i in range(5):
            print(f"  Build {i}: pred={pred[i].item():.3f}, actual={labels[i].item()}")
    
    torch.save(model.state_dict(), '/tmp/tower_model.pt')
    print("\nSaved to /tmp/tower_model.pt")

if __name__ == '__main__':
    train()
