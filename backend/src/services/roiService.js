import logger from '../utils/logger.js';

class ROIService {
  constructor() {
    this.assumptions = {
      attorneyHourlyRate: 500,
      juniorAttorneyRate: 300,
      seniorAttorneyRate: 800,
      partnerRate: 1200,
      averageContractValue: 10000,
      riskExposurePerIssue: 5000,
      clientAcquisitionValue: 5000,
      monthlyClientRetention: 0.95,
      trainingCostPerAttorney: 10000,
      adminCostPerAttorney: 15000,
      errorCostPerMistake: 5000,
      ragCostPerToken: 0.000001,
      cagCostPerToken: 0.000001,
      queriesPerMonth: 100,
      documentsPerMonth: 50
    };
  }

  calculateBillableHourRecovery(sessionData, queryData) {
    const manualReviewMinutes = Math.max(30, Math.ceil(queryData.documentLength / 10000));
    const cagProcessTime = queryData.responseTime / 1000 / 60; // Convert to minutes
    const minutesSaved = manualReviewMinutes - cagProcessTime;
    const hoursSaved = minutesSaved / 60;
    
    const rate = this.determineAttorneyRate(queryData.queryComplexity);
    const revenueRecovered = hoursSaved * rate;
    
    return {
      category: 'Billable Hour Recovery',
      metrics: {
        manualReviewMinutes,
        cagProcessTime: Math.round(cagProcessTime * 10) / 10,
        minutesSaved: Math.round(minutesSaved * 10) / 10,
        hoursSaved: Math.round(hoursSaved * 100) / 100,
        attorneyRate: rate,
        revenueRecovered: Math.round(revenueRecovered * 100) / 100
      },
      impact: {
        monthlyProjection: revenueRecovered * 20, // Assuming 20 similar queries/month
        annualProjection: revenueRecovered * 240
      }
    };
  }

  calculateRiskMitigation(documentMetadata, queryResponse) {
    const riskKeywords = ['liability', 'indemnify', 'breach', 'penalty', 'termination', 'forfeit'];
    const identifiedRisks = this.extractRiskFactors(queryResponse);
    const riskScore = this.calculateRiskScore(identifiedRisks);
    const exposureAvoided = identifiedRisks.length * this.assumptions.riskExposurePerIssue;
    
    return {
      category: 'Risk Mitigation',
      metrics: {
        risksIdentified: identifiedRisks.length,
        riskScore: Math.round(riskScore * 100) / 100,
        averageExposurePerRisk: this.assumptions.riskExposurePerIssue,
        totalExposureAvoided: exposureAvoided,
        complianceImprovement: Math.min(95, 60 + (identifiedRisks.length * 5))
      },
      impact: {
        liabilityReduction: exposureAvoided,
        insurancePremiumReduction: exposureAvoided * 0.1,
        complianceValue: exposureAvoided * 0.3
      }
    };
  }

  calculateClientServiceVelocity(queryData, sessionData) {
    const traditionalTurnaround = 72; // 3 days in hours
    const cagTurnaround = queryData.responseTime / 1000 / 3600; // Convert to hours
    const timeSavedHours = traditionalTurnaround - cagTurnaround;
    const dealAccelerationDays = Math.min(14, timeSavedHours / 8);
    
    return {
      category: 'Client Service Velocity',
      metrics: {
        traditionalTurnaroundHours: traditionalTurnaround,
        cagTurnaroundHours: Math.round(cagTurnaround * 100) / 100,
        timeSavedHours: Math.round(timeSavedHours * 100) / 100,
        dealAccelerationDays: Math.round(dealAccelerationDays * 10) / 10,
        responseSpeedImprovement: Math.round((traditionalTurnaround / cagTurnaround) * 100)
      },
      impact: {
        clientSatisfactionImprovement: Math.min(40, dealAccelerationDays * 3),
        dealValueAcceleration: dealAccelerationDays * (this.assumptions.averageContractValue / 30),
        clientRetentionValue: this.assumptions.clientAcquisitionValue * 0.25
      }
    };
  }

  calculateCompetitiveAdvantage(sessionData, performanceData) {
    const marketDifferentiationScore = this.calculateDifferentiationScore(performanceData);
    const newClientsPerMonth = Math.max(0, Math.floor(marketDifferentiationScore / 50)); // Much more conservative
    const pricingPremium = marketDifferentiationScore > 70 ? 0.05 : 0.02; // Lower premium
    
    return {
      category: 'Competitive Advantage',
      metrics: {
        differentiationScore: marketDifferentiationScore,
        newClientsPerMonth,
        pricingPremium: Math.round(pricingPremium * 100),
        marketPosition: this.getMarketPosition(marketDifferentiationScore),
        innovationLeadership: marketDifferentiationScore > 60
      },
      impact: {
        newClientRevenue: newClientsPerMonth * this.assumptions.clientAcquisitionValue,
        premiumRevenue: this.assumptions.averageContractValue * pricingPremium,
        brandValueMultiplier: 1 + (marketDifferentiationScore / 100)
      }
    };
  }

  calculateKnowledgeManagement(sessionData, queryData, performanceData) {
    const juniorEfficiency = this.calculateJuniorEfficiency(sessionData, queryData);
    const knowledgeRetentionRate = this.calculateKnowledgeRetention(sessionData);
    const consistencyImprovement = this.calculateConsistencyImprovement(performanceData);
    
    return {
      category: 'Knowledge Management',
      metrics: {
        juniorEfficiencyImprovement: Math.round(juniorEfficiency * 100),
        knowledgeRetentionRate: Math.round(knowledgeRetentionRate * 100),
        consistencyImprovement: Math.round(consistencyImprovement * 100),
        trainingTimeReduction: Math.round(juniorEfficiency * 0.5 * 100),
        mentorshipCostSavings: this.assumptions.trainingCostPerAttorney * juniorEfficiency
      },
      impact: {
        trainingCostReduction: this.assumptions.trainingCostPerAttorney * juniorEfficiency,
        qualityConsistencyValue: this.assumptions.averageContractValue * consistencyImprovement * 0.1,
        scalabilityFactor: 1 + juniorEfficiency
      }
    };
  }

  calculateOperationalEfficiency(sessionData, queryData) {
    const adminOverheadReduction = this.calculateAdminReduction(sessionData);
    const errorRateReduction = this.calculateErrorReduction(queryData);
    const reworkReduction = this.calculateReworkReduction(queryData);
    
    return {
      category: 'Operational Efficiency',
      metrics: {
        adminOverheadReduction: Math.round(adminOverheadReduction * 100),
        errorRateReduction: Math.round(errorRateReduction * 100),
        reworkReduction: Math.round(reworkReduction * 100),
        processEfficiencyImprovement: Math.round((adminOverheadReduction + errorRateReduction + reworkReduction) / 3 * 100),
        supportStaffOptimization: Math.floor(adminOverheadReduction * 2)
      },
      impact: {
        adminCostSavings: this.assumptions.adminCostPerAttorney * adminOverheadReduction,
        errorCostAvoidance: this.assumptions.errorCostPerMistake * errorRateReduction * 10,
        reworkCostSavings: this.assumptions.attorneyHourlyRate * reworkReduction * 8,
        workflowValue: this.assumptions.averageContractValue * 0.05
      }
    };
  }

  calculateCAGCostSavings(queryData, costAnalysis) {
    if (!costAnalysis) {
      return {
        category: 'CAG Cost Savings',
        metrics: {
          cachedTokens: 0,
          newTokens: 0,
          totalCost: 0,
          ragCost: 0,
          savingsPercent: 0
        },
        impact: {
          monthlySavings: 0,
          annualSavings: 0
        }
      };
    }

    // Calculate what RAG would cost (no caching)
    const ragCost = (costAnalysis.cachedTokens + costAnalysis.newTokens) * this.assumptions.ragCostPerToken;
    const cagCost = costAnalysis.totalCost;
    const querySavings = ragCost - cagCost;
    
    // Project monthly and annual savings
    const monthlySavings = querySavings * this.assumptions.queriesPerMonth;
    const annualSavings = monthlySavings * 12;
    
    // Calculate additional benefits
    const tokenEfficiency = costAnalysis.cacheEfficiency || 0;
    const queriesPerHour = 3600 / (queryData.responseTime / 1000); // Queries per hour
    const capacityIncrease = queriesPerHour * costAnalysis.cacheEfficiency / 100;
    
    // More realistic time value calculation
    const timeSavedPerQuery = (queryData.responseTime / 1000) * 0.75; // Assume 75% time saved with caching
    const monthlyTimeSaved = timeSavedPerQuery * this.assumptions.queriesPerMonth / 3600; // Hours per month
    const valueOfSavedTime = monthlyTimeSaved * this.assumptions.attorneyHourlyRate * 12; // Annual value
    
    return {
      category: 'CAG Cost Savings',
      metrics: {
        cachedTokens: costAnalysis.cachedTokens,
        newTokens: costAnalysis.newTokens,
        totalCost: cagCost,
        ragCost: ragCost,
        querySavings: querySavings,
        savingsPercent: costAnalysis.savingsPercent,
        tokenEfficiency: tokenEfficiency,
        queriesPerHour: Math.round(queriesPerHour),
        capacityIncrease: Math.round(capacityIncrease)
      },
      impact: {
        monthlySavings: Math.round(monthlySavings * 100) / 100,
        annualSavings: Math.round(annualSavings * 100) / 100,
        additionalQueries: Math.round(capacityIncrease * this.assumptions.queriesPerMonth),
        valueOfSavedTime: Math.round(valueOfSavedTime)
      }
    };
  }

  calculateBasicTimeSavings(queryData) {
    // Simple calculation: if cache saves 75% of time, calculate actual dollar value
    const timeSavedPerQuery = (queryData.responseTime / 1000) * 0.75; // 75% time saved
    const monthlyTimeSaved = timeSavedPerQuery * this.assumptions.queriesPerMonth / 3600; // Hours per month
    const valueOfTimeSaved = monthlyTimeSaved * this.assumptions.attorneyHourlyRate;
    
    return {
      category: 'Time Savings',
      metrics: {
        timeSavedPerQuery: Math.round(timeSavedPerQuery * 100) / 100,
        monthlyTimeSaved: Math.round(monthlyTimeSaved * 100) / 100,
        queriesPerMonth: this.assumptions.queriesPerMonth
      },
      impact: {
        monthlyValue: Math.round(valueOfTimeSaved * 100) / 100,
        annualValue: Math.round(valueOfTimeSaved * 12 * 100) / 100
      }
    };
  }

  calculateComprehensiveROI(sessionData, queryData, performanceData) {
    const roiCategories = [];
    
    // Only add CAG cost savings if cost analysis is available - this is the only realistic metric
    if (queryData.costAnalysis) {
      roiCategories.push(this.calculateCAGCostSavings(queryData, queryData.costAnalysis));
    }
    
    // Add basic operational efficiency based on actual time savings
    if (queryData.responseTime) {
      roiCategories.push(this.calculateBasicTimeSavings(queryData));
    }

    // Add token optimization savings if available
    if (sessionData.tokenOptimization) {
      roiCategories.push(this.calculateTokenOptimizationROI(sessionData, queryData));
    }

    // Add Headroom compression savings if available
    if (sessionData.documents?.some(doc => doc.compression?.enabled) || sessionData.headroomStats) {
      roiCategories.push(this.calculateHeadroomCompressionROI(sessionData, queryData));
    }

    const totalMonthlyImpact = roiCategories.reduce((sum, category) => {
      // Only include specific monetary values we know are realistic
      const monetaryImpact = Object.entries(category.impact)
        .filter(([key, value]) => {
          // Only include these specific monetary values
          const isValid = ['monthlySavings', 'annualSavings', 'valueOfSavedTime', 'monthlyValue', 'annualValue'].includes(key) && typeof value === 'number';
          if (!isValid) {
            logger.info(`Excluding non-monetary value: ${key} = ${value}`);
          }
          return isValid;
        })
        .reduce((catSum, [key, value]) => {
          logger.info(`Including monetary value: ${key} = ${value}`);
          return catSum + value;
        }, 0);
      return sum + monetaryImpact;
    }, 0);

    const totalAnnualImpact = totalMonthlyImpact * 12;
    const roiPercentage = (totalAnnualImpact / 50000) * 100; // Assuming $50K investment

    return {
      summary: {
        totalMonthlyImpact: Math.round(totalMonthlyImpact),
        totalAnnualImpact: Math.round(totalAnnualImpact),
        roiPercentage: Math.round(roiPercentage),
        investmentAmount: 50000,
        paybackPeriodMonths: Math.ceil(50000 / totalMonthlyImpact)
      },
      categories: roiCategories,
      highImpactStories: this.generateImpactStories(roiCategories),
      cfoReadyMetrics: this.generateCFOMetrics(roiCategories, totalAnnualImpact)
    };
  }

  determineAttorneyRate(queryComplexity) {
    if (queryComplexity === 'high') return this.assumptions.seniorAttorneyRate;
    if (queryComplexity === 'medium') return this.assumptions.attorneyHourlyRate;
    return this.assumptions.juniorAttorneyRate;
  }

  extractRiskFactors(queryResponse) {
    const riskPatterns = [
      /liability/i,
      /indemnif/i,
      /breach/i,
      /penalty/i,
      /termination/i,
      /forfeit/i,
      /damages/i,
      /obligation/i
    ];

    const risks = [];
    riskPatterns.forEach(pattern => {
      if (pattern.test(queryResponse)) {
        risks.push(pattern.source.replace(/[\/gi]/g, ''));
      }
    });

    return risks;
  }

  calculateRiskScore(risks) {
    const riskWeights = {
      'liability': 0.9,
      'indemnif': 0.8,
      'breach': 0.7,
      'penalty': 0.6,
      'termination': 0.5,
      'forfeit': 0.4,
      'damages': 0.3,
      'obligation': 0.2
    };

    return risks.reduce((score, risk) => score + (riskWeights[risk] || 0.1), 0) / risks.length || 0;
  }

  calculateTokenOptimizationROI(sessionData, queryData) {
    const tokenSavings = sessionData.tokenOptimization?.totalTokenSavings || 0;
    const tokensGenerated = sessionData.tokenOptimization?.tokensGenerated || 1;
    const averageSavings = sessionData.tokenOptimization?.averageSavingsPerToken || 0;
    
    // Calculate bandwidth and storage savings
    const bandwidthSavingsPerToken = averageSavings; // bytes saved per token
    const monthlyTokens = tokensGenerated * 30; // estimate monthly usage
    const monthlyBandwidthSavings = bandwidthSavingsPerToken * monthlyTokens;
    
    // Calculate storage savings (tokens stored in logs, cache, etc.)
    const storageMultiplier = 3; // tokens stored in multiple places
    const monthlyStorageSavings = monthlyBandwidthSavings * storageMultiplier;
    
    // Calculate cost savings (bandwidth costs ~$0.01/GB, storage costs ~$0.02/GB)
    const bandwidthCostSavings = (monthlyBandwidthSavings / 1024 / 1024 / 1024) * 0.01;
    const storageCostSavings = (monthlyStorageSavings / 1024 / 1024 / 1024) * 0.02;
    
    // Calculate performance improvement
    const transmissionSpeedImprovement = (averageSavings / 300) * 100; // % faster transmission
    const processingTimeSavings = transmissionSpeedImprovement * 0.1; // 10% of transmission time saved
    
    return {
      category: 'Token Optimization',
      metrics: {
        tokenSavings: Math.round(tokenSavings),
        tokensGenerated,
        averageSavingsPerToken: Math.round(averageSavings * 10) / 10,
        monthlyBandwidthSavings: Math.round(monthlyBandwidthSavings),
        monthlyStorageSavings: Math.round(monthlyStorageSavings),
        bandwidthCostSavings: Math.round(bandwidthCostSavings * 100) / 100,
        storageCostSavings: Math.round(storageCostSavings * 100) / 100,
        transmissionSpeedImprovement: Math.round(transmissionSpeedImprovement * 10) / 10,
        processingTimeSavings: Math.round(processingTimeSavings * 10) / 10
      },
      financialImpact: {
        monthlySavings: bandwidthCostSavings + storageCostSavings,
        annualSavings: (bandwidthCostSavings + storageCostSavings) * 12,
        valueOfSavedTime: processingTimeSavings * 100, // $100 per hour value
        totalAnnualImpact: ((bandwidthCostSavings + storageCostSavings) * 12) + (processingTimeSavings * 100 * 12)
      }
    };
  }

  calculateHeadroomCompressionROI(sessionData, queryData) {
    // Get compression statistics from documents or session
    const documents = sessionData.documents || [];
    let totalOriginalSize = 0;
    let totalCompressedSize = 0;
    let totalSavings = 0;
    let documentsCompressed = 0;
    
    // Calculate compression statistics from documents
    documents.forEach(doc => {
      if (doc.compression && doc.compression.enabled) {
        totalOriginalSize += doc.compression.originalSize;
        totalCompressedSize += doc.compression.compressedSize;
        totalSavings += doc.compression.savings;
        documentsCompressed++;
      }
    });
    
    // Fallback to session-level stats if available
    if (totalOriginalSize === 0 && sessionData.headroomStats) {
      totalOriginalSize = sessionData.headroomStats.totalOriginalSize || 0;
      totalCompressedSize = sessionData.headroomStats.totalCompressedSize || 0;
      totalSavings = sessionData.headroomStats.totalSavings || 0;
      documentsCompressed = sessionData.headroomStats.totalCompressed || 0;
    }
    
    // Calculate average compression ratio
    const averageCompressionRatio = totalOriginalSize > 0 ? 
      ((totalOriginalSize - totalCompressedSize) / totalOriginalSize * 100) : 0;
    
    // Estimate monthly impact
    const monthlyDocuments = this.assumptions.documentsPerMonth;
    const averageDocumentSize = totalOriginalSize / Math.max(documentsCompressed, 1);
    const monthlyOriginalSize = monthlyDocuments * averageDocumentSize;
    const monthlyCompressedSize = monthlyDocuments * averageDocumentSize * (1 - averageCompressionRatio / 100);
    const monthlySavings = monthlyOriginalSize - monthlyCompressedSize;
    
    // Calculate token savings (rough estimation: 4 chars per token)
    const monthlyTokenSavings = Math.round(monthlySavings / 4);
    const tokenCostSavings = monthlyTokenSavings * this.assumptions.cagCostPerToken;
    
    // Calculate bandwidth and storage savings
    const bandwidthCostSavings = (monthlySavings / 1024 / 1024 / 1024) * 0.01; // $0.01/GB
    const storageCostSavings = (monthlySavings / 1024 / 1024 / 1024) * 0.02; // $0.02/GB
    
    // Calculate performance improvements
    const processingTimeReduction = averageCompressionRatio * 0.3; // 30% of compression ratio as time savings
    const averageQueryTime = 3000; // 3 seconds average
    const timeSavingsPerQuery = averageQueryTime * (processingTimeReduction / 100);
    const monthlyTimeSavings = timeSavingsPerQuery * this.assumptions.queriesPerMonth;
    
    // Calculate value of time savings
    const timeValuePerHour = this.assumptions.attorneyHourlyRate;
    const monthlyTimeValue = (monthlyTimeSavings / 3600) * timeValuePerHour;
    
    // Total monthly savings
    const totalMonthlySavings = tokenCostSavings + bandwidthCostSavings + storageCostSavings + monthlyTimeValue;
    const totalAnnualSavings = totalMonthlySavings * 12;
    
    return {
      category: 'Headroom AI Compression',
      metrics: {
        documentsCompressed,
        averageCompressionRatio: Math.round(averageCompressionRatio * 10) / 10,
        totalSavingsBytes: Math.round(totalSavings),
        monthlySavingsBytes: Math.round(monthlySavings),
        monthlyTokenSavings: Math.round(monthlyTokenSavings),
        processingTimeReduction: Math.round(processingTimeReduction * 10) / 10,
        monthlyTimeSavings: Math.round(monthlyTimeSavings / 1000) / 10, // in seconds
        bandwidthCostSavings: Math.round(bandwidthCostSavings * 100) / 100,
        storageCostSavings: Math.round(storageCostSavings * 100) / 100,
        tokenCostSavings: Math.round(tokenCostSavings * 100) / 100,
        monthlyTimeValue: Math.round(monthlyTimeValue),
        totalMonthlySavings: Math.round(totalMonthlySavings),
        totalAnnualSavings: Math.round(totalAnnualSavings)
      },
      description: `AI-powered document compression reduces storage and processing costs by ${averageCompressionRatio.toFixed(1)}% while maintaining quality`,
      impact: {
        level: averageCompressionRatio > 50 ? 'High' : averageCompressionRatio > 25 ? 'Medium' : 'Low',
        confidence: 85,
        timeframe: 'Immediate'
      }
    };
  }

  calculateDifferentiationScore(performanceData) {
    if (!performanceData) {
      return 50; // Default score if no performance data available
    }
    
    const cacheHitRate = performanceData.cacheHitRate || 0;
    const responseTime = performanceData.averageResponseTime || 1000;
    const costEfficiency = performanceData.costPerQuery || 0.1;
    
    let score = 0;
    score += Math.min(40, cacheHitRate * 40);
    score += Math.max(0, 30 - (responseTime / 100));
    score += Math.max(0, 30 - (costEfficiency * 100));
    
    return Math.min(100, Math.round(score));
  }

  getMarketPosition(score) {
    if (score >= 80) return 'Technology Leader';
    if (score >= 60) return 'Early Adopter';
    if (score >= 40) return 'Competitive';
    return 'Traditional';
  }

  calculateJuniorEfficiency(sessionData, queryData) {
    const queryCount = sessionData.queryCount || 1;
    const cacheHitRate = sessionData.cacheHitRate || 0;
    return Math.min(0.8, (queryCount * 0.1) + (cacheHitRate * 0.3));
  }

  calculateKnowledgeRetention(sessionData) {
    const documentCount = sessionData.documentCount || 1;
    const queryCount = sessionData.queryCount || 1;
    return Math.min(0.95, 0.7 + (documentCount * 0.05) + (queryCount * 0.02));
  }

  calculateConsistencyImprovement(performanceData) {
    if (!performanceData) {
      return 0.7; // Default improvement if no performance data available
    }
    
    const cacheHitRate = performanceData.cacheHitRate || 0;
    return Math.min(0.9, 0.6 + (cacheHitRate * 0.4));
  }

  calculateAdminReduction(sessionData) {
    const automationLevel = Math.min(1, (sessionData.queryCount || 1) * 0.2);
    return automationLevel * 0.7;
  }

  calculateErrorReduction(queryData) {
    const hasAIReview = queryData.fromCache !== undefined;
    return hasAIReview ? 0.6 : 0.3;
  }

  calculateReworkReduction(queryData) {
    const responseQuality = queryData.responseTime < 2000 ? 0.8 : 0.5;
    return responseQuality * 0.7;
  }

  generateImpactStories(roiCategories) {
    const stories = [];
    
    const billableHours = roiCategories.find(cat => cat.category === 'Billable Hour Recovery');
    if (billableHours && billableHours.metrics.hoursSaved > 0.5) {
      stories.push({
        type: 'Rainmaker Impact',
        story: `Senior partner recovered ${billableHours.metrics.hoursSaved} billable hours per contract analysis. At $${billableHours.metrics.attorneyRate}/hr, this generates $${billableHours.metrics.revenueRecovered} in additional revenue per document.`,
        value: billableHours.metrics.revenueRecovered * 20
      });
    }

    const riskMitigation = roiCategories.find(cat => cat.category === 'Risk Mitigation');
    if (riskMitigation && riskMitigation.metrics.risksIdentified > 2) {
      stories.push({
        type: 'Risk Shield Impact',
        story: `Identified ${riskMitigation.metrics.risksIdentified} critical risk factors that could have resulted in $${riskMitigation.metrics.totalExposureAvoided} in potential liability. Client paid premium for our thorough analysis.`,
        value: riskMitigation.metrics.totalExposureAvoided * 0.2
      });
    }

    const velocity = roiCategories.find(cat => cat.category === 'Client Service Velocity');
    if (velocity && velocity.metrics.dealAccelerationDays > 1) {
      stories.push({
        type: 'Speed King Impact',
        story: `Accelerated deal closing by ${velocity.metrics.dealAccelerationDays} days through instant contract analysis. Won competitive bid against firms taking 3+ days for similar analysis.`,
        value: velocity.metrics.dealValueAcceleration
      });
    }

    return stories;
  }

  generateCFOMetrics(roiCategories, totalAnnualImpact) {
    return {
      revenueImpact: {
        direct: Math.round(totalAnnualImpact * 0.4),
        indirect: Math.round(totalAnnualImpact * 0.3),
        total: Math.round(totalAnnualImpact * 0.7)
      },
      costSavings: {
        operational: Math.round(totalAnnualImpact * 0.2),
        risk: Math.round(totalAnnualImpact * 0.1),
        total: Math.round(totalAnnualImpact * 0.3)
      },
      efficiencyGains: {
        productivity: Math.round(totalAnnualImpact * 0.15),
        scalability: Math.round(totalAnnualImpact * 0.1),
        total: Math.round(totalAnnualImpact * 0.25)
      },
      investmentMetrics: {
        paybackPeriod: Math.ceil(50000 / (totalAnnualImpact / 12)),
        roiMultiple: Math.round(totalAnnualImpact / 50000),
        npv: Math.round(totalAnnualImpact * 3 - 50000),
        irr: Math.round((totalAnnualImpact / 50000) * 100)
      }
    };
  }

  updateAssumptions(newAssumptions) {
    this.assumptions = { ...this.assumptions, ...newAssumptions };
    logger.info('ROI assumptions updated', newAssumptions);
  }

  getAssumptions() {
    return { ...this.assumptions };
  }
}

export default new ROIService();
