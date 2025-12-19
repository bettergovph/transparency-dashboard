#!/usr/bin/env python3
"""
Train Clustering Model for Spending Pattern Analysis

Cluster departments and agencies based on spending behavior patterns.

Usage:
    python train_clustering_model.py --features ../features/budget_features.parquet --output ../models/
"""

import argparse
import json
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np
import joblib
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA


def prepare_features_for_clustering(df: pd.DataFrame, entity_level='agency'):
    """Aggregate features at entity level for clustering."""
    
    if entity_level == 'agency':
        group_cols = ['department', 'agency', 'uacs_dpt_dsc', 'uacs_agy_dsc']
    else:
        group_cols = ['department', 'uacs_dpt_dsc']
    
    # Aggregate key metrics per entity
    entity_features = df.groupby(group_cols).agg({
        'amt': ['sum', 'mean', 'std'],
        'yoy_growth_rate': ['mean', 'std'],
        'dept_share_of_total': 'mean',
        'year': ['min', 'max', 'count']
    }).reset_index()
    
    # Flatten column names
    entity_features.columns = ['_'.join(col).strip('_') for col in entity_features.columns.values]
    
    # Rename entity columns
    if entity_level == 'agency':
        entity_features.rename(columns={
            'department': 'entity_id',
            'uacs_dpt_dsc': 'department_desc',
            'uacs_agy_dsc': 'entity_desc'
        }, inplace=True)
    else:
        entity_features.rename(columns={
            'department': 'entity_id',
            'uacs_dpt_dsc': 'entity_desc'
        }, inplace=True)
    
    # Fill NaN values
    entity_features = entity_features.fillna(0)
    
    return entity_features


def train_kmeans_clustering(X, n_clusters=5):
    """Train K-means clustering model."""
    
    print(f"\nTraining K-means clustering (n_clusters={n_clusters})...")
    
    model = KMeans(
        n_clusters=n_clusters,
        random_state=42,
        n_init=10,
        max_iter=300
    )
    
    cluster_labels = model.fit_predict(X)
    
    # Calculate inertia (within-cluster sum of squares)
    inertia = model.inertia_
    
    print(f"  Inertia: {inertia:.2f}")
    print(f"  Cluster sizes: {np.bincount(cluster_labels)}")
    
    return model, cluster_labels


def perform_pca(X, n_components=2):
    """Perform PCA for dimensionality reduction."""
    
    print(f"\nPerforming PCA (n_components={n_components})...")
    
    pca = PCA(n_components=n_components, random_state=42)
    X_pca = pca.fit_transform(X)
    
    explained_variance = pca.explained_variance_ratio_
    total_variance = sum(explained_variance)
    
    print(f"  Explained variance: {explained_variance}")
    print(f"  Total variance explained: {total_variance:.2%}")
    
    return pca, X_pca


def assign_cluster_labels(cluster_id: int, cluster_stats: dict) -> str:
    """Assign meaningful labels to clusters based on characteristics."""
    
    # This is a simple rule-based labeling
    # You can customize this based on domain knowledge
    
    labels = {
        0: 'High Budget - Stable Growth',
        1: 'Medium Budget - Variable Growth',
        2: 'Low Budget - Rapid Growth',
        3: 'Large Departments',
        4: 'Small Specialized Agencies'
    }
    
    return labels.get(cluster_id, f'Cluster {cluster_id}')


def main():
    parser = argparse.ArgumentParser(description='Train clustering model for spending patterns')
    parser.add_argument('--features', required=True, help='Input features Parquet file')
    parser.add_argument('--output', required=True, help='Output directory for models')
    parser.add_argument('--n-clusters', type=int, default=5, help='Number of clusters (default: 5)')
    parser.add_argument('--entity-level', default='agency', choices=['department', 'agency'],
                        help='Entity level for clustering (default: agency)')
    
    args = parser.parse_args()
    
    print(f"Loading features from {args.features}...")
    df = pd.read_parquet(args.features)
    
    print(f"Data shape: {df.shape}")
    
    # Prepare features at entity level
    print(f"\nPreparing features at {args.entity_level} level...")
    entity_features = prepare_features_for_clustering(df, entity_level=args.entity_level)
    
    print(f"Entity features shape: {entity_features.shape}")
    
    # Select numerical features for clustering
    feature_cols = [col for col in entity_features.columns 
                   if col not in ['entity_id', 'entity_desc', 'department_desc', 'agency']]
    
    X = entity_features[feature_cols]
    
    print(f"Using features: {feature_cols}")
    
    # Scale features
    print("\nScaling features...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train K-means
    model, cluster_labels = train_kmeans_clustering(X_scaled, n_clusters=args.n_clusters)
    
    # Perform PCA for visualization
    pca, X_pca = perform_pca(X_scaled, n_components=2)
    
    # Add cluster assignments to entity features
    entity_features['cluster_id'] = cluster_labels
    entity_features['pca_1'] = X_pca[:, 0]
    entity_features['pca_2'] = X_pca[:, 1]
    
    # Assign cluster labels
    entity_features['cluster_label'] = entity_features['cluster_id'].apply(
        lambda x: assign_cluster_labels(x, {})
    )
    
    # Calculate cluster statistics
    cluster_stats = []
    for cluster_id in range(args.n_clusters):
        cluster_data = entity_features[entity_features['cluster_id'] == cluster_id]
        
        stats = {
            'cluster_id': int(cluster_id),
            'cluster_label': assign_cluster_labels(cluster_id, {}),
            'size': len(cluster_data),
            'avg_total_budget': float(cluster_data['amt_sum'].mean()),
            'avg_growth_rate': float(cluster_data['yoy_growth_rate_mean'].mean())
        }
        cluster_stats.append(stats)
    
    print("\nCluster statistics:")
    for stat in cluster_stats:
        print(f"  {stat['cluster_label']} ({stat['cluster_id']}): "
              f"{stat['size']} entities, "
              f"Avg budget: {stat['avg_total_budget']:,.0f}")
    
    # Save outputs
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # Save K-means model
    model_path = output_dir / 'cluster_model.pkl'
    joblib.dump(model, model_path)
    print(f"\nSaved model to {model_path}")
    
    # Save scaler
    scaler_path = output_dir / 'cluster_scaler.pkl'
    joblib.dump(scaler, scaler_path)
    print(f"Saved scaler to {scaler_path}")
    
    # Save PCA model
    pca_path = output_dir / 'cluster_pca.pkl'
    joblib.dump(pca, pca_path)
    print(f"Saved PCA to {pca_path}")
    
    # Save metadata
    metadata = {
        'model_type': 'kmeans',
        'training_date': datetime.now().isoformat(),
        'n_clusters': args.n_clusters,
        'entity_level': args.entity_level,
        'features': feature_cols,
        'cluster_statistics': cluster_stats,
        'pca_explained_variance': pca.explained_variance_ratio_.tolist()
    }
    
    metadata_path = output_dir / 'cluster_model_metadata.json'
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    print(f"Saved metadata to {metadata_path}")
    
    # Save cluster assignments to predictions directory
    predictions_dir = output_dir.parent / 'predictions'
    predictions_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d')
    clusters_output = predictions_dir / f'spending_clusters_{timestamp}.parquet'
    
    # Select relevant columns for output
    output_cols = [
        'entity_id', 'entity_desc', 'cluster_id', 'cluster_label',
        'amt_sum', 'yoy_growth_rate_mean', 'dept_share_of_total_mean',
        'pca_1', 'pca_2'
    ]
    
    available_output_cols = [col for col in output_cols if col in entity_features.columns]
    cluster_results = entity_features[available_output_cols].copy()
    cluster_results['analysis_date'] = datetime.now().isoformat()
    
    cluster_results.to_parquet(clusters_output, index=False, compression='snappy')
    print(f"Saved cluster results to {clusters_output}")
    
    print("\n✓ Clustering training complete!")


if __name__ == '__main__':
    main()
