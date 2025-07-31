import React from 'react';

const CampaignStats = ({ stats, formatCurrency, formatNumber }) => {
  const statCards = [
    {
      title: 'Total Campaigns',
      value: stats.total,
      icon: '📊',
      color: 'bg-blue-500',
      textColor: 'text-blue-500'
    },
    {
      title: 'Active Campaigns',
      value: stats.active,
      icon: '🟢',
      color: 'bg-green-500',
      textColor: 'text-green-500'
    },
    {
      title: 'Total Spend',
      value: formatCurrency(stats.totalSpend),
      icon: '💰',
      color: 'bg-yellow-500',
      textColor: 'text-yellow-500'
    },
    {
      title: 'Total Impressions',
      value: formatNumber(stats.totalImpressions),
      icon: '👁️',
      color: 'bg-purple-500',
      textColor: 'text-purple-500'
    },
    {
      title: 'Avg CTR',
      value: `${stats.avgCTR.toFixed(2)}%`,
      icon: '📈',
      color: 'bg-indigo-500',
      textColor: 'text-indigo-500'
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats.totalRevenue),
      icon: '💵',
      color: 'bg-emerald-500',
      textColor: 'text-emerald-500'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((stat, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{stat.title}</p>
              <p className="text-xl font-semibold text-gray-900 mt-1">{stat.value}</p>
            </div>
            <div className={`w-10 h-10 rounded-full ${stat.color} flex items-center justify-center text-white text-lg`}>
              {stat.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CampaignStats; 