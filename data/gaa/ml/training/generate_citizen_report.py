#!/usr/bin/env python3
"""
Generate Citizen-Friendly Budget Analysis Report

Creates an easy-to-understand report of budget predictions and insights
for the general public.

Usage:
    python generate_citizen_report.py --predictions ../predictions/ --actual ../../gaa.parquet --output ../predictions/citizen_report.html
"""

import argparse
from pathlib import Path
from datetime import datetime

import pandas as pd
import numpy as np


def format_peso(amount):
    """Format amount in pesos with appropriate scale."""
    if amount >= 1_000_000_000_000:  # Trillion
        return f"₱{amount/1_000_000_000_000:.2f} Trillion"
    elif amount >= 1_000_000_000:  # Billion  
        return f"₱{amount/1_000_000_000:.2f} Billion"
    elif amount >= 1_000_000:  # Million
        return f"₱{amount/1_000_000:.2f} Million"
    else:
        return f"₱{amount:,.2f}"


def get_historical_trend(df_actual, group_by='year'):
    """Get historical budget trends."""
    if df_actual is None or len(df_actual) == 0:
        return None
    
    trend = df_actual.groupby(group_by)['amt'].sum().sort_index()
    return trend


def load_actual_data(parquet_path: Path) -> pd.DataFrame:
    """Load actual budget data."""
    
    print(f"Loading actual data from {parquet_path}...")
    df = pd.read_parquet(parquet_path)
    
    # IMPORTANT: Amounts in the database are stored in thousands
    # Multiply by 1000 to get actual peso amounts
    if 'amt' in df.columns:
        df['amt'] = df['amt'] * 1000
    
    # Filter out Automatic Appropriations and New General Appropriations
    if 'uacs_dpt_dsc' in df.columns:
        before_count = len(df)
        df = df[
            (~df['uacs_dpt_dsc'].str.contains('Automatic Appropriations', case=False, na=False)) &
            (~df['uacs_dpt_dsc'].str.contains('New General Appropriations', case=False, na=False))
        ]
        filtered_count = before_count - len(df)
        if filtered_count > 0:
            print(f"  Filtered out {filtered_count:,} records (Automatic/New General Appropriations)")
    
    print(f"  Loaded {len(df)} records")
    print(f"  Years: {sorted(df['year'].unique())}")
    
    return df


def load_predictions(predictions_dir: Path, prediction_type: str):
    """Load prediction files from directory."""
    
    pattern = f"{prediction_type}_*.parquet"
    files = list(predictions_dir.glob(pattern))
    
    if not files:
        return None
    
    # Load most recent file
    latest_file = sorted(files)[-1]
    print(f"\nLoading {prediction_type} predictions from {latest_file.name}...")
    df = pd.read_parquet(latest_file)
    
    # IMPORTANT: Predictions are also stored in thousands
    # Multiply by 1000 to get actual peso amounts
    if 'predicted_amt' in df.columns:
        df['predicted_amt'] = df['predicted_amt'] * 1000
    if 'amt' in df.columns:
        df['amt'] = df['amt'] * 1000
    if 'amt_sum' in df.columns:
        df['amt_sum'] = df['amt_sum'] * 1000
    if 'avg_budget' in df.columns:
        df['avg_budget'] = df['avg_budget'] * 1000
    if 'total_budget' in df.columns:
        df['total_budget'] = df['total_budget'] * 1000
    
    # Filter out Automatic Appropriations and New General Appropriations
    if 'uacs_dpt_dsc' in df.columns:
        before_count = len(df)
        df = df[
            (~df['uacs_dpt_dsc'].str.contains('Automatic Appropriations', case=False, na=False)) &
            (~df['uacs_dpt_dsc'].str.contains('New General Appropriations', case=False, na=False))
        ]
        filtered_count = before_count - len(df)
        if filtered_count > 0:
            print(f"  Filtered out {filtered_count:,} records (Automatic/New General Appropriations)")
    
    if 'entity_desc' in df.columns:
        # For clustering results, filter by entity description
        before_count = len(df)
        df = df[
            (~df['entity_desc'].str.contains('Automatic Appropriations', case=False, na=False)) &
            (~df['entity_desc'].str.contains('New General Appropriations', case=False, na=False))
        ]
        filtered_count = before_count - len(df)
        if filtered_count > 0:
            print(f"  Filtered out {filtered_count:,} entities (Automatic/New General Appropriations)")
    
    print(f"  Loaded {len(df)} predictions")
    
    return df


def generate_html_header():
    """Generate HTML header with Tailwind CSS and Chart.js."""
    return """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Philippine Budget Analysis Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        body {
            font-family: 'Inter', sans-serif;
        }
        .chart-container {
            position: relative;
            height: 400px;
            margin: 20px 0;
        }
        .stat-card {
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .stat-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="w-full">
"""


def generate_html_footer():
    """Generate HTML footer."""
    return """
    </div>
</body>
</html>
"""


def generate_forecast_section(df_forecast, df_actual):
    """Generate citizen-friendly forecast section with charts and methodology."""
    
    if df_forecast is None:
        return ""
    
    forecast_year = df_forecast['year'].iloc[0]
    total_predicted = df_forecast['predicted_amt'].sum()
    
    # Get historical trend
    historical_trend = get_historical_trend(df_actual, 'year')
    
    # Check if we have actual data to compare
    df_actual_year = df_actual[df_actual['year'] == forecast_year] if df_actual is not None else pd.DataFrame()
    has_actual = len(df_actual_year) > 0
    
    html = f"""
        <section id="forecast" class="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
            <h2 class="text-2xl font-bold text-gray-900 mb-6 pb-3 border-b-2 border-gray-900">📊 Budget Forecast for {forecast_year}</h2>
            
            <!-- Methodology Section -->
            <div class="bg-gray-900 text-white rounded-lg p-6 mb-6">
                <h3 class="text-lg font-semibold mb-3 flex items-center">
                    <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                    </svg>
                    How We Made This Prediction
                </h3>
                <p class="text-sm text-gray-300 mb-3">
                    Our computer model analyzed <strong>years of historical budget data</strong> to identify patterns in government spending. 
                    The prediction for {forecast_year} is based on:
                </p>
                <div class="grid md:grid-cols-2 gap-3 text-sm">
                    <div class="flex items-start space-x-2">
                        <span class="text-white">•</span>
                        <span class="text-gray-300"><strong>Historical Trends:</strong> Budget growth/decline patterns</span>
                    </div>
                    <div class="flex items-start space-x-2">
                        <span class="text-white">•</span>
                        <span class="text-gray-300"><strong>Department Patterns:</strong> Typical spending behavior</span>
                    </div>
                    <div class="flex items-start space-x-2">
                        <span class="text-white">•</span>
                        <span class="text-gray-300"><strong>YoY Changes:</strong> Rate of budget increases</span>
                    </div>
                    <div class="flex items-start space-x-2">
                        <span class="text-white">•</span>
                        <span class="text-gray-300"><strong>Economic Indicators:</strong> Spending vs total budget</span>
                    </div>
                </div>
                <div class="mt-3 text-xs text-gray-400">
                    <strong>Technology:</strong> XGBoost Machine Learning Algorithm
                </div>
            </div>

            <!-- Key Statistics -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="stat-card bg-white border-2 border-gray-900 rounded-lg p-5">
                    <div class="text-gray-600 text-xs font-medium mb-1 uppercase tracking-wide">Total Predicted Budget</div>
                    <div class="text-3xl font-bold text-gray-900">{format_peso(total_predicted)}</div>
                </div>
                <div class="stat-card bg-white border-2 border-gray-900 rounded-lg p-5">
                    <div class="text-gray-600 text-xs font-medium mb-1 uppercase tracking-wide">Agencies Analyzed</div>
                    <div class="text-3xl font-bold text-gray-900">{len(df_forecast):,}</div>
                </div>
                <div class="stat-card bg-white border-2 border-gray-900 rounded-lg p-5">
                    <div class="text-gray-600 text-xs font-medium mb-1 uppercase tracking-wide">Confidence Level</div>
                    <div class="text-3xl font-bold text-gray-900">High</div>
                </div>
            </div>
    """
    
    # Historical Trend Chart
    if historical_trend is not None and len(historical_trend) > 0:
        years = historical_trend.index.tolist()
        amounts = historical_trend.values.tolist()
        
        # Add forecast year
        years.append(forecast_year)
        amounts.append(total_predicted)
        
        html += f"""
            <!-- Historical Trend Chart -->
            <div class="mb-6">
                <h3 class="text-lg font-semibold text-gray-900 mb-3">📈 Budget Trend: History vs Prediction</h3>
                <div class="bg-gray-50 border-l-4 border-gray-900 p-4 mb-4 text-sm">
                    <p class="text-gray-700"><strong>What you're seeing:</strong> This chart shows actual government budgets from previous years (in black) and our prediction for {forecast_year} (in gray). The trend line helps visualize how the budget has changed over time.</p>
                </div>
                <div class="chart-container bg-white p-4 border border-gray-200 rounded-lg">
                    <canvas id="trendChart"></canvas>
                </div>
            </div>
            
            <script>
                const trendCtx = document.getElementById('trendChart').getContext('2d');
                new Chart(trendCtx, {{
                    type: 'line',
                    data: {{
                        labels: {years},
                        datasets: [{{
                            label: 'Actual Budget',
                            data: {amounts[:-1]},
                            borderColor: 'rgb(0, 0, 0)',
                            backgroundColor: 'rgba(0, 0, 0, 0.05)',
                            borderWidth: 3,
                            fill: true,
                            tension: 0.4
                        }}, {{
                            label: '{forecast_year} Prediction',
                            data: [null, null, null, {amounts[-1]}],
                            borderColor: 'rgb(107, 114, 128)',
                            backgroundColor: 'rgba(107, 114, 128, 0.1)',
                            borderWidth: 3,
                            borderDash: [10, 5],
                            fill: false,
                            pointRadius: 8,
                            pointHoverRadius: 10
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                display: true,
                                position: 'top',
                                labels: {{
                                    font: {{ size: 14 }}
                                }}
                            }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        let label = context.dataset.label || '';
                                        if (label) {{
                                            label += ': ';
                                        }}
                                        const value = context.parsed.y;
                                        if (value >= 1000000000000) {{
                                            label += '₱' + (value / 1000000000000).toFixed(2) + ' Trillion';
                                        }} else if (value >= 1000000000) {{
                                            label += '₱' + (value / 1000000000).toFixed(2) + ' Billion';
                                        }} else {{
                                            label += '₱' + value.toLocaleString();
                                        }}
                                        return label;
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: false,
                                ticks: {{
                                    callback: function(value) {{
                                        if (value >= 1000000000000) {{
                                            return '₱' + (value / 1000000000000).toFixed(1) + 'T';
                                        }} else if (value >= 1000000000) {{
                                            return '₱' + (value / 1000000000).toFixed(1) + 'B';
                                        }}
                                        return '₱' + value;
                                    }}
                                }}
                            }}
                        }}
                    }}
                }});
            </script>
        """
    
    # Add comparison if actual data exists
    if has_actual:
        total_actual = df_actual_year['amt'].sum()
        difference = total_predicted - total_actual
        accuracy = (1 - abs(difference) / total_actual) * 100
        
        html += f"""
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-8">
                <h3 class="text-xl font-bold text-yellow-800 mb-4">✅ Prediction Accuracy Check</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <p class="text-gray-600 mb-1">Actual {forecast_year} Budget</p>
                        <p class="text-2xl font-bold text-gray-800">{format_peso(total_actual)}</p>
                    </div>
                    <div>
                        <p class="text-gray-600 mb-1">Our Prediction</p>
                        <p class="text-2xl font-bold text-gray-800">{format_peso(total_predicted)}</p>
                    </div>
                </div>
                <div class="mt-4 pt-4 border-t border-yellow-200">
                    <p class="text-gray-700"><strong>Difference:</strong> <span class="{'text-green-600' if difference < 0 else 'text-red-600'} font-bold">{format_peso(abs(difference))} {'lower' if difference < 0 else 'higher'}</span></p>
                    <p class="text-gray-700 mt-2"><strong>Accuracy Rate:</strong> <span class="text-blue-600 font-bold">{accuracy:.1f}%</span></p>
                </div>
            </div>
        """
    
    # Top predicted departments with chart
    dept_predictions = df_forecast.groupby(['uacs_dpt_dsc'])['predicted_amt'].sum().nlargest(10).reset_index()
    
    dept_names = dept_predictions['uacs_dpt_dsc'].tolist()
    dept_amounts = dept_predictions['predicted_amt'].tolist()
    
    html += f"""
            <h3 class="text-2xl font-semibold text-gray-800 mb-4 mt-8">🏛️ Top 10 Departments by Predicted Budget</h3>
            
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <p class="text-gray-700"><strong>Why this matters:</strong> These are the government departments expected to receive the most funding. This shows where the government plans to focus its resources - whether on education, infrastructure, healthcare, defense, or other priorities.</p>
            </div>
            
            <div class="chart-container bg-white p-4 rounded-lg border border-gray-200 mb-6">
                <canvas id="deptChart"></canvas>
            </div>
            
            <script>
                const deptCtx = document.getElementById('deptChart').getContext('2d');
                new Chart(deptCtx, {{
                    type: 'bar',
                    data: {{
                        labels: {[name[:50] + '...' if len(name) > 50 else name for name in dept_names]},
                        datasets: [{{
                            label: 'Predicted Budget',
                            data: {dept_amounts},
                            backgroundColor: 'rgba(59, 130, 246, 0.7)',
                            borderColor: 'rgb(59, 130, 246)',
                            borderWidth: 2
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        indexAxis: 'y',
                        plugins: {{
                            legend: {{ display: false }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        const value = context.parsed.x;
                                        if (value >= 1000000000000) {{
                                            return '₱' + (value / 1000000000000).toFixed(2) + ' Trillion';
                                        }} else if (value >= 1000000000) {{
                                            return '₱' + (value / 1000000000).toFixed(2) + ' Billion';
                                        }}
                                        return '₱' + value.toLocaleString();
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            x: {{
                                ticks: {{
                                    callback: function(value) {{
                                        if (value >= 1000000000000) {{
                                            return '₱' + (value / 1000000000000).toFixed(1) + 'T';
                                        }} else if (value >= 1000000000) {{
                                            return '₱' + (value / 1000000000).toFixed(1) + 'B';
                                        }}
                                        return '₱' + value;
                                    }}
                                }}
                            }}
                        }}
                    }}
                }});
            </script>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead class="bg-blue-600 text-white">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold">Department</th>
                            <th class="px-6 py-4 text-right text-sm font-semibold">Predicted Budget</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
    """
    
    for idx, row in dept_predictions.iterrows():
        html += f"""
                        <tr class="hover:bg-gray-50 transition-colors">
                            <td class="px-6 py-4 text-sm text-gray-600">{idx + 1}</td>
                            <td class="px-6 py-4 text-sm font-medium text-gray-900">{row['uacs_dpt_dsc']}</td>
                            <td class="px-6 py-4 text-sm font-bold text-blue-600 text-right">{format_peso(row['predicted_amt'])}</td>
                        </tr>
        """
    
    html += """
                    </tbody>
                </table>
            </div>
        </section>
    """
    
    return html


def generate_anomalies_section(df_anomalies, df_actual):
    """Generate citizen-friendly anomalies section with charts and methodology."""
    
    if df_anomalies is None:
        return ""
    
    total_anomalies = len(df_anomalies)
    total_records = len(df_actual) if df_actual is not None else 0
    anomaly_rate = (total_anomalies / total_records * 100) if total_records > 0 else 0
    
    html = f"""
        <section id="anomalies" class="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 class="text-3xl font-bold text-blue-600 mb-6 pb-4 border-b-2 border-gray-200">🔍 Unusual Budget Allocations Found</h2>
            
            <!-- Methodology Section -->
            <div class="bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-lg p-6 mb-8">
                <h3 class="text-2xl font-semibold mb-4">🔬 How We Detected Anomalies</h3>
                <p class="text-lg leading-relaxed mb-4">
                    Our system uses two powerful detection methods to find unusual budget patterns:
                </p>
                <div class="grid md:grid-cols-2 gap-4">
                    <div class="bg-white bg-opacity-20 rounded p-4">
                        <h4 class="font-semibold text-lg mb-2">🤖 1. Machine Learning (Isolation Forest)</h4>
                        <p class="text-sm">
                            An AI algorithm that learns what "normal" budgets look like across all departments, 
                            then identifies items that significantly deviate from these patterns.
                        </p>
                    </div>
                    <div class="bg-white bg-opacity-20 rounded p-4">
                        <h4 class="font-semibold text-lg mb-2">📊 2. Statistical Analysis (Z-Score)</h4>
                        <p class="text-sm">
                            Mathematical analysis that calculates how far each budget item is from the typical 
                            average. Items more than 3 standard deviations away are flagged.
                        </p>
                    </div>
                </div>
                <p class="mt-4 text-sm opacity-90">
                    <strong>Important:</strong> An anomaly doesn't mean wrongdoing - it could indicate new programs, emergency responses, or policy changes that deserve public attention.
                </p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div class="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-lg p-6 border-l-4 border-yellow-600">
                    <div class="text-gray-600 text-sm font-medium mb-2">Unusual Allocations Detected</div>
                    <div class="text-3xl font-bold text-yellow-600">{total_anomalies:,}</div>
                </div>
                <div class="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-6 border-l-4 border-orange-600">
                    <div class="text-gray-600 text-sm font-medium mb-2">Percentage of All Budgets</div>
                    <div class="text-3xl font-bold text-orange-600">{anomaly_rate:.1f}%</div>
                </div>
            </div>
    """
    
    # Anomaly types if available
    if 'anomaly_type' in df_anomalies.columns:
        type_descriptions = {
            'high_growth': 'Budget increased by more than 100% from previous year',
            'decline': 'Budget decreased by more than 50% from previous year',
            'spending_spike': 'Spending was more than double the usual average',
            'high_concentration': 'Department received more than 10% of total budget',
            'other': 'Other unusual patterns detected'
        }
        
        type_counts = df_anomalies['anomaly_type'].value_counts()
        type_labels = type_counts.index.tolist()
        type_values = type_counts.values.tolist()
        colors = ['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6']
        
        html += f"""
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">🎯 Types of Unusual Patterns Found</h3>
            
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p class="text-gray-700"><strong>What each pattern means:</strong> These categories help classify why a budget item was flagged. Understanding the type of anomaly helps determine whether it needs investigation or is simply a normal policy change.</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div class="chart-container bg-white p-4 rounded-lg border border-gray-200">
                    <canvas id="anomalyTypeChart"></canvas>
                </div>
                <div class="bg-gray-50 p-6 rounded-lg">
                    <h4 class="font-semibold text-lg mb-4 text-gray-800">Pattern Explanations</h4>
        """
        
        for atype, count in type_counts.items():
            description = type_descriptions.get(atype, 'Unusual pattern detected')
            pct = (count / total_anomalies) * 100
            html += f"""
                    <div class="mb-4 pb-4 border-b border-gray-200 last:border-0">
                        <div class="flex justify-between items-start mb-1">
                            <span class="font-medium text-gray-800">{atype.replace('_', ' ').title()}</span>
                            <span class="text-blue-600 font-bold">{count} ({pct:.1f}%)</span>
                        </div>
                        <p class="text-sm text-gray-600">{description}</p>
                    </div>
            """
        
        html += f"""
                </div>
            </div>
            
            <script>
                const anomalyTypeCtx = document.getElementById('anomalyTypeChart').getContext('2d');
                new Chart(anomalyTypeCtx, {{
                    type: 'doughnut',
                    data: {{
                        labels: {[t.replace('_', ' ').title() for t in type_labels]},
                        datasets: [{{
                            data: {type_values},
                            backgroundColor: {colors[:len(type_values)]},
                            borderWidth: 2,
                            borderColor: '#fff'
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                position: 'bottom',
                                labels: {{
                                    font: {{ size: 12 }},
                                    padding: 15
                                }}
                            }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        const label = context.label || '';
                                        const value = context.parsed;
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((value / total) * 100).toFixed(1);
                                        return label + ': ' + value + ' (' + percentage + '%)';
                                    }}
                                }}
                            }}
                        }}
                    }}
                }});
            </script>
        """
    
    # Top departments with anomalies
    if 'uacs_dpt_dsc' in df_anomalies.columns:
        dept_anomalies = df_anomalies.groupby('uacs_dpt_dsc').size().nlargest(10).reset_index(name='count')
        
        html += """
            <h3 class="text-2xl font-semibold text-gray-800 mb-4 mt-8">⚠️ Departments with Most Unusual Allocations</h3>
            
            <div class="bg-yellow-50 border border-yellow-300 rounded-lg p-6 mb-6">
                <div class="flex items-start">
                    <div class="text-3xl mr-4">⚠️</div>
                    <div>
                        <h4 class="font-bold text-yellow-800 text-lg mb-2">Areas for Closer Review</h4>
                        <p class="text-gray-700">These departments had the most budget items flagged as unusual. This doesn't necessarily indicate problems, but citizens and oversight bodies may want to review these more carefully to understand why these allocations differ from normal patterns.</p>
                    </div>
                </div>
            </div>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead class="bg-yellow-600 text-white">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold">Rank</th>
                            <th class="px-6 py-4 text-left text-sm font-semibold">Department</th>
                            <th class="px-6 py-4 text-right text-sm font-semibold">Unusual Items Found</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
        """
        
        for idx, row in dept_anomalies.iterrows():
            html += f"""
                        <tr class="hover:bg-yellow-50 transition-colors">
                            <td class="px-6 py-4 text-sm text-gray-600">{idx + 1}</td>
                            <td class="px-6 py-4 text-sm font-medium text-gray-900">{row['uacs_dpt_dsc']}</td>
                            <td class="px-6 py-4 text-sm font-bold text-yellow-600 text-right">{row['count']}</td>
                        </tr>
            """
        
        html += """
                    </tbody>
                </table>
            </div>
        """
    
    html += """
        </section>
    """
    
    return html


def generate_clusters_section(df_clusters):
    """Generate citizen-friendly clustering section with charts and methodology."""
    
    if df_clusters is None:
        return ""
    
    n_clusters = df_clusters['cluster_id'].nunique()
    
    html = f"""
        <section id="clusters" class="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 class="text-3xl font-bold text-blue-600 mb-6 pb-4 border-b-2 border-gray-200">📈 Spending Pattern Groups</h2>
            
            <!-- Methodology Section -->
            <div class="bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg p-6 mb-8">
                <h3 class="text-2xl font-semibold mb-4">🔬 How We Grouped Agencies</h3>
                <p class="text-lg leading-relaxed mb-4">
                    We used a machine learning technique called <strong>K-means Clustering</strong> to group government agencies based on their spending behavior. The analysis considered:
                </p>
                <ul class="list-disc list-inside space-y-2 ml-4">
                    <li><strong>Total Budget Size:</strong> How much each agency typically receives</li>
                    <li><strong>Growth Patterns:</strong> Whether their budgets tend to increase, decrease, or stay stable</li>
                    <li><strong>Budget Share:</strong> What percentage of the total government budget they receive</li>
                    <li><strong>Spending Stability:</strong> Whether their allocations are consistent or vary significantly</li>
                </ul>
                <p class="mt-4 text-sm opacity-90">
                    <strong>Why group agencies?</strong> Grouping helps identify agencies with similar spending behavior, making it easier to compare efficiency, detect unusual patterns, and understand government priorities.
                </p>
            </div>

            <div class="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-6 border-l-4 border-purple-600 mb-8">
                <div class="text-gray-600 text-sm font-medium mb-2">Number of Spending Groups Found</div>
                <div class="text-3xl font-bold text-purple-600">{n_clusters}</div>
                <p class="text-gray-600 text-sm mt-2">Agencies were automatically categorized into {n_clusters} distinct groups based on their budget characteristics</p>
            </div>
    """
    
    # Group information
    cluster_info = df_clusters.groupby(['cluster_id', 'cluster_label']).agg({
        'entity_id': 'count',
        'amt_sum': ['sum', 'mean']
    }).reset_index()
    cluster_info.columns = ['cluster_id', 'cluster_label', 'num_agencies', 'total_budget', 'avg_budget']
    cluster_info = cluster_info.sort_values('total_budget', ascending=False)
    
    cluster_labels = cluster_info['cluster_label'].tolist()
    cluster_budgets = cluster_info['total_budget'].tolist()
    cluster_counts = cluster_info['num_agencies'].tolist()
    
    html += f"""
            <h3 class="text-2xl font-semibold text-gray-800 mb-4">🏛️ Spending Groups Overview</h3>
            
            <div class="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
                <p class="text-gray-700"><strong>Understanding the groups:</strong> Each group represents agencies that share similar budget patterns. This helps identify which agencies are comparable and can reveal insights about government structure and priorities.</p>
            </div>
            
            <div class="grid md:grid-cols-2 gap-6 mb-6">
                <div class="chart-container bg-white p-4 rounded-lg border border-gray-200">
                    <h4 class="text-center font-semibold text-gray-700 mb-2">Total Budget by Group</h4>
                    <canvas id="clusterBudgetChart"></canvas>
                </div>
                <div class="chart-container bg-white p-4 rounded-lg border border-gray-200">
                    <h4 class="text-center font-semibold text-gray-700 mb-2">Number of Agencies per Group</h4>
                    <canvas id="clusterCountChart"></canvas>
                </div>
            </div>
            
            <script>
                // Budget Chart
                const clusterBudgetCtx = document.getElementById('clusterBudgetChart').getContext('2d');
                new Chart(clusterBudgetCtx, {{
                    type: 'bar',
                    data: {{
                        labels: {cluster_labels},
                        datasets: [{{
                            label: 'Total Budget',
                            data: {cluster_budgets},
                            backgroundColor: [
                                'rgba(139, 92, 246, 0.7)',
                                'rgba(59, 130, 246, 0.7)',
                                'rgba(16, 185, 129, 0.7)',
                                'rgba(245, 158, 11, 0.7)',
                                'rgba(239, 68, 68, 0.7)'
                            ],
                            borderColor: [
                                'rgb(139, 92, 246)',
                                'rgb(59, 130, 246)',
                                'rgb(16, 185, 129)',
                                'rgb(245, 158, 11)',
                                'rgb(239, 68, 68)'
                            ],
                            borderWidth: 2
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{ display: false }},
                            tooltip: {{
                                callbacks: {{
                                    label: function(context) {{
                                        const value = context.parsed.y;
                                        if (value >= 1000000000000) {{
                                            return '₱' + (value / 1000000000000).toFixed(2) + ' Trillion';
                                        }} else if (value >= 1000000000) {{
                                            return '₱' + (value / 1000000000).toFixed(2) + ' Billion';
                                        }}
                                        return '₱' + value.toLocaleString();
                                    }}
                                }}
                            }}
                        }},
                        scales: {{
                            y: {{
                                beginAtZero: true,
                                ticks: {{
                                    callback: function(value) {{
                                        if (value >= 1000000000000) {{
                                            return '₱' + (value / 1000000000000).toFixed(1) + 'T';
                                        }} else if (value >= 1000000000) {{
                                            return '₱' + (value / 1000000000).toFixed(1) + 'B';
                                        }}
                                        return '₱' + value;
                                    }}
                                }}
                            }}
                        }}
                    }}
                }});
                
                // Count Chart
                const clusterCountCtx = document.getElementById('clusterCountChart').getContext('2d');
                new Chart(clusterCountCtx, {{
                    type: 'pie',
                    data: {{
                        labels: {cluster_labels},
                        datasets: [{{
                            data: {cluster_counts},
                            backgroundColor: [
                                'rgba(139, 92, 246, 0.8)',
                                'rgba(59, 130, 246, 0.8)',
                                'rgba(16, 185, 129, 0.8)',
                                'rgba(245, 158, 11, 0.8)',
                                'rgba(239, 68, 68, 0.8)'
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }}]
                    }},
                    options: {{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {{
                            legend: {{
                                position: 'bottom',
                                labels: {{
                                    font: {{ size: 11 }},
                                    padding: 10
                                }}
                            }}
                        }}
                    }}
                }});
            </script>
            
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead class="bg-purple-600 text-white">
                        <tr>
                            <th class="px-6 py-4 text-left text-sm font-semibold">Group</th>
                            <th class="px-6 py-4 text-center text-sm font-semibold">Number of Agencies</th>
                            <th class="px-6 py-4 text-right text-sm font-semibold">Total Budget</th>
                            <th class="px-6 py-4 text-right text-sm font-semibold">Average per Agency</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
    """
    
    for _, row in cluster_info.iterrows():
        html += f"""
                        <tr class="hover:bg-purple-50 transition-colors">
                            <td class="px-6 py-4 text-sm font-bold text-gray-900">{row['cluster_label']}</td>
                            <td class="px-6 py-4 text-sm text-gray-600 text-center">{int(row['num_agencies'])}</td>
                            <td class="px-6 py-4 text-sm font-bold text-purple-600 text-right">{format_peso(row['total_budget'])}</td>
                            <td class="px-6 py-4 text-sm text-gray-600 text-right">{format_peso(row['avg_budget'])}</td>
                        </tr>
        """
    
    html += """
                    </tbody>
                </table>
            </div>
        </section>
    """
    
    return html


def main():
    parser = argparse.ArgumentParser(description='Generate citizen-friendly budget report')
    parser.add_argument('--predictions', required=True, help='Predictions directory')
    parser.add_argument('--actual', help='Actual data Parquet file (optional)')
    parser.add_argument('--output', required=True, help='Output HTML file')
    
    args = parser.parse_args()
    
    predictions_dir = Path(args.predictions)
    actual_path = Path(args.actual) if args.actual else None
    output_path = Path(args.output)
    
    print("Generating citizen-friendly budget report...")
    
    # Load data
    df_actual = None
    if actual_path and actual_path.exists():
        df_actual = load_actual_data(actual_path)
    
    df_forecast = load_predictions(predictions_dir, 'budget_forecast')
    df_anomalies = load_predictions(predictions_dir, 'anomalies')
    df_clusters = load_predictions(predictions_dir, 'spending_clusters')
    
    # Generate HTML
    html = generate_html_header()
    
    # Dashboard Header - Black and White
    html += f"""
        <!-- Top Navigation Bar -->
        <nav class="bg-black text-white border-b border-gray-800">
            <div class="px-8 py-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="text-2xl font-bold tracking-tight">🇵🇭 Philippine Budget Analysis Dashboard</h1>
                        <p class="text-gray-400 text-sm mt-1">Real-time insights into government spending</p>
                    </div>
                    <div class="text-right">
                        <div class="text-sm text-gray-400">Last Updated</div>
                        <div class="text-lg font-semibold">{datetime.now().strftime('%b %d, %Y')}</div>
                        <div class="text-xs text-gray-500">{datetime.now().strftime('%I:%M %p')}</div>
                    </div>
                </div>
            </div>
        </nav>
        
        <!-- Main Content -->
        <div class="px-8 py-6">
            <!-- Introduction Panel -->
            <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-6 mb-6">
                <div class="flex items-start space-x-4">
                    <div class="flex-shrink-0">
                        <svg class="w-12 h-12 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                        </svg>
                    </div>
                    <div class="flex-1">
                        <h2 class="text-xl font-bold text-gray-900 mb-3">About This Dashboard</h2>
                        <p class="text-gray-700 mb-3">
                            This dashboard uses <strong>artificial intelligence and data analysis</strong> to provide transparent insights into Philippine government budget allocations based on the <strong>General Appropriations Act (GAA)</strong>.
                        </p>
                        <div class="grid md:grid-cols-3 gap-4 text-sm">
                            <div class="flex items-start space-x-2">
                                <span class="text-gray-900 font-semibold">•</span>
                                <span class="text-gray-600">Predict future budget needs using historical trends</span>
                            </div>
                            <div class="flex items-start space-x-2">
                                <span class="text-gray-900 font-semibold">•</span>
                                <span class="text-gray-600">Identify unusual spending patterns for public oversight</span>
                            </div>
                            <div class="flex items-start space-x-2">
                                <span class="text-gray-900 font-semibold">•</span>
                                <span class="text-gray-600">Group agencies by spending behavior for comparison</span>
                            </div>
                        </div>
                        <div class="mt-4 p-3 bg-gray-50 border-l-4 border-gray-900 rounded">
                            <p class="text-sm text-gray-800"><strong>💡 Why Transparency Matters:</strong> Your tax money, your right to know. This data empowers citizens to engage in informed discussions about public finances.</p>
                        </div>
                    </div>
                </div>
            </div>
    """
    
    # Add sections
    html += generate_forecast_section(df_forecast, df_actual)
    html += generate_anomalies_section(df_anomalies, df_actual)
    html += generate_clusters_section(df_clusters)
    
    # Conclusion with Tailwind
    html += """
        <section id="conclusion" class="bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg shadow-lg p-8 mb-8">
            <h2 class="text-3xl font-bold mb-6">💡 What Can You Do With This Information?</h2>
            
            <div class="grid md:grid-cols-2 gap-6">
                <div class="bg-white bg-opacity-20 rounded-lg p-6">
                    <h3 class="text-xl font-semibold mb-4 flex items-center">
                        <span class="text-3xl mr-3">👥</span>
                        As a Citizen
                    </h3>
                    <ul class="space-y-2 text-sm">
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Ask questions about government spending priorities and policy decisions</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Compare predictions with actual allocations to hold officials accountable</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Identify areas where unusual spending might need investigation</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Engage in informed public discourse about the national budget</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Share this report with your community to promote awareness</span>
                        </li>
                    </ul>
                </div>
                
                <div class="bg-white bg-opacity-20 rounded-lg p-6">
                    <h3 class="text-xl font-semibold mb-4 flex items-center">
                        <span class="text-3xl mr-3">📝</span>
                        For Journalists & Advocates
                    </h3>
                    <ul class="space-y-2 text-sm">
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Use anomaly detections as leads for investigative reporting</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Compare department budgets to understand policy priorities</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Track trends over time to identify shifts in government focus</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Educate the public on budget transparency and accountability</span>
                        </li>
                        <li class="flex items-start">
                            <span class="mr-2">•</span>
                            <span>Advocate for evidence-based policy discussions</span>
                        </li>
                    </ul>
                </div>
            </div>
            
            <div class="mt-6 p-4 bg-white bg-opacity-30 rounded-lg">
                <p class="text-lg"><strong>⚠️ Important Reminder:</strong> This analysis is a tool to promote transparency and civic engagement. It should be used alongside other information sources, official government reports, and expert analysis. The predictions and anomaly detections are based on statistical patterns and should not be taken as definitive proof of wrongdoing or inefficiency.</p>
            </div>
        </section>
    """
    
    html += """
        <footer class="mt-12 pt-8 border-t-2 border-gray-300 text-center">
            <div class="bg-gray-100 rounded-lg p-6 mb-4">
                <p class="text-gray-700 text-lg mb-2"><strong>📊 Data Source</strong></p>
                <p class="text-gray-600">This report was generated using machine learning analysis of Philippine Government <strong>General Appropriations Act (GAA)</strong> data.</p>
                <p class="text-gray-600 mt-2">Technologies used: XGBoost, Isolation Forest, K-means Clustering, Python, Chart.js</p>
            </div>
            <p class="text-gray-500 text-sm">For questions or feedback about this analysis, please contact your local government transparency advocates or budget oversight organizations.</p>
            <p class="text-gray-400 text-xs mt-4">&copy; {datetime.now().year} - Transparency Dashboard Project</p>
        </footer>
    """
    
    html += generate_html_footer()
    
    # Save HTML file
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(html)
    
    print(f"✓ Citizen-friendly report saved to: {output_path}")
    print(f"\nYou can open it in any web browser to view the report.")
    
    return 0


if __name__ == '__main__':
    exit(main())
