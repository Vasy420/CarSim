export class GeneticAlgorithm {
  constructor(populationSize, mutationRate, mutationAmount) {
    this.populationSize = populationSize;
    this.mutationRate = mutationRate;
    this.mutationAmount = mutationAmount;
    this.generation = 0;
    this.bestFitness = 0;
    this.allTimeBest = null;
    this.history = [];
  }
  
  // Select the best performing cars
  selectBest(cars, count) {
    const sorted = [...cars].sort((a, b) => b.score - a.score);
    return sorted.slice(0, count);
  }
  
  // Create next generation
  evolve(cars) {
    this.generation++;

    // Get best performers
    const topPerformers = this.selectBest(cars, Math.ceil(this.populationSize * 0.2));
    
    // Track best
    if (topPerformers[0].score > this.bestFitness) {
      this.bestFitness = topPerformers[0].score;
      this.allTimeBest = topPerformers[0].brain.clone();
    }

    // Record history for fitness chart
    const avgScore = cars.reduce((s, c) => s + c.score, 0) / cars.length;
    this.history.push({ generation: this.generation, bestScore: topPerformers[0].score, avgScore });
    if (this.history.length > 100) this.history.shift();
    
    const newBrains = [];
    
    // Elite: Keep best performers unchanged
    const eliteCount = Math.ceil(topPerformers.length * 0.1);
    for (let i = 0; i < eliteCount; i++) {
      newBrains.push(topPerformers[i].brain.clone());
    }
    
    // Fill rest with mutated versions of top performers
    while (newBrains.length < this.populationSize) {
      // Pick a random top performer
      const parent = topPerformers[Math.floor(Math.random() * topPerformers.length)];
      const child = parent.brain.clone();
      
      // Mutate with varying rates (some more, some less)
      const mutRate = this.mutationRate * (0.5 + Math.random() * 1.5);
      child.mutate(mutRate, this.mutationAmount);
      
      newBrains.push(child);
    }
    
    return newBrains;
  }
  
  // Get statistics
  getStats(cars) {
    const aliveCars = cars.filter(c => !c.damaged);
    const scores = cars.map(c => c.score);
    
    return {
      generation: this.generation,
      alive: aliveCars.length,
      total: cars.length,
      bestScore: Math.max(...scores),
      avgScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      allTimeBest: this.bestFitness
    };
  }
}
