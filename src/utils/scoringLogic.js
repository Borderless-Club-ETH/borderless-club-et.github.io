// This calculates the "Projected Score" based on your 70/30 weightage
export const calculateEthioScore = (baseScore, userTime, peerTime) => {
  const accuracyWeight = 0.7;
  const timeWeight = 0.3;

  // If user is faster than peers, they get a bonus (max 20% extra)
  const efficiencyRatio = Math.min(peerTime / userTime, 1.2);
  const timeEfficiencyBonus = baseScore * efficiencyRatio;

  const projectedScore = (baseScore * accuracyWeight) + (timeEfficiencyBonus * timeWeight);
  
  return Math.round(projectedScore);
};