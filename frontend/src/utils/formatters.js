// Currency formatting
export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  }).format(amount);
};

// Time formatting
export const formatTime = (milliseconds) => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else if (milliseconds < 60000) {
    return `${(milliseconds / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
};

// Token formatting
export const formatTokens = (tokens) => {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`;
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`;
  }
  return tokens.toString();
};

// Percentage formatting
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) {
    return '0%';
  }
  return `${numValue.toFixed(decimals)}%`;
};

// Date formatting
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
};

// File size formatting
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Query history formatting
export const formatQueryHistory = (query) => {
  return {
    ...query,
    formattedCost: formatCurrency(query.costAnalysis?.totalCost || 0),
    formattedTime: formatTime(query.responseTime),
    formattedDate: formatDate(query.timestamp),
    savingsPercent: formatPercentage(query.costAnalysis?.savingsPercent || 0),
    cacheEfficiency: formatPercentage(query.costAnalysis?.cacheEfficiency || 0),
  };
};

// ROI data formatting
export const formatROIData = (roiData) => {
  return {
    ...roiData,
    formattedAnnualImpact: formatCurrency(roiData.summary?.totalAnnualImpact || 0),
    formattedROIPercentage: formatPercentage(roiData.summary?.roiPercentage || 0),
    paybackPeriod: roiData.summary?.paybackPeriodMonths || 0,
  };
};
