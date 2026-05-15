import React, { useState } from 'react';
import { Simulator } from './components/Simulator';
import { ControlPanel } from './components/ControlPanel';
import { StatsPanel } from './components/StatsPanel';
import { ModelManager } from './components/ModelManager';
import WelcomePage from './components/WelcomePage';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner';
import { Brain, Zap } from 'lucide-react';

function App() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isRunning, setIsRunning] = useState(true);
  const [speedMultiplier, setSpeedMultiplier] = useState(1);
  const [populationSize, setPopulationSize] = useState(100);
  const [showSensors, setShowSensors] = useState(true);
  const [showNetwork, setShowNetwork] = useState(false);
  const [controlMode, setControlMode] = useState('AI_AUTO'); // 'MANUAL', 'AI_AUTO', 'AI_ASSIST'
  const [difficulty, setDifficulty] = useState('medium'); // 'easy' | 'medium' | 'hard'
  // Hard = old medium (80). New medium = lighter (50). Easy unchanged (40).
  const trafficDensity = difficulty === 'easy' ? 40 : difficulty === 'hard' ? 80 : 50;
  const [modelManagerOpen, setModelManagerOpen] = useState(false);
  const [stats, setStats] = useState({
    generation: 0,
    alive: 0,
    total: 20,
    bestScore: 0,
    avgScore: 0,
    allTimeBest: 0
  });
  const [resetTrigger, setResetTrigger] = useState(0);

  const handleSaveModel = (modelData) => {
    // Model saved via ModelManager
  };

  const handleLoadModel = (modelData) => {
    // Model loaded via ModelManager
    // In full implementation, this would load the brain data
  };

  const handleControlModeChange = (newMode) => {
    setControlMode(newMode);
    setResetTrigger(prev => prev + 1);
    toast.info(`Switched to ${newMode === 'MANUAL' ? 'Manual Drive' : 'AI Auto'} mode`);
  };

  const handleReset = () => {
    setResetTrigger(prev => prev + 1);
    toast.info('Simulation reset', {
      description: 'Starting new evolution from generation 0'
    });
  };

  if (showWelcome) {
    return <WelcomePage onStart={() => setShowWelcome(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" theme="dark" />

      {/* Header */}
      <header className="border-b border-border/50 bg-card/30 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-cyber flex items-center justify-center glow-cyan">
                <Brain className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-glow-cyan tracking-tight">
                  Car Sim
                </h1>
                <p className="text-sm text-muted-foreground">
                  AI-Powered Autonomous Driving Evolution
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowWelcome(true)}
                className="px-4 py-2 rounded-lg bg-secondary/20 border border-secondary/30 text-sm font-medium text-secondary hover:bg-secondary/30 transition-colors"
              >
                Back to Home
              </button>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/30 border border-primary/30">
                <Zap className="h-4 w-4 text-primary animate-pulse-glow" />
                <span className="text-sm font-medium text-primary">Live Training</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Sidebar - Controls */}
          <div className="lg:col-span-3 space-y-6">
            <ControlPanel
              isRunning={isRunning}
              onToggleRun={() => setIsRunning(!isRunning)}
              speedMultiplier={speedMultiplier}
              onSpeedChange={setSpeedMultiplier}
              showSensors={showSensors}
              onToggleSensors={setShowSensors}
              showNetwork={showNetwork}
              onToggleNetwork={setShowNetwork}
              onReset={handleReset}
              populationSize={populationSize}
              onPopulationChange={setPopulationSize}
              controlMode={controlMode}
              onControlModeChange={handleControlModeChange}
              onOpenModelManager={() => setModelManagerOpen(true)}
              difficulty={difficulty}
              onDifficultyChange={setDifficulty}
            />
            <StatsPanel stats={stats} />
          </div>

          {/* Main Simulator */}
          <div className="lg:col-span-9">
            <div className="rounded-lg border-2 border-primary/30 bg-card/20 p-4 backdrop-blur-sm">
              <Simulator
                isRunning={isRunning}
                speedMultiplier={speedMultiplier}
                populationSize={populationSize}
                showSensors={showSensors}
                showNetwork={showNetwork}
                onStatsUpdate={setStats}
                resetTrigger={resetTrigger}
                controlMode={controlMode}
                trafficDensity={trafficDensity}
              />
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="p-4 rounded-lg bg-muted/30 border border-primary/20">
                <h3 className="font-semibold text-primary mb-2">🧠 Neural Network</h3>
                <p className="text-sm text-muted-foreground">
                  Each car has a brain with 8 inputs (7 sensors + speed) and 3 outputs (steer, throttle, brake)
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-secondary/20">
                <h3 className="font-semibold text-secondary mb-2">🧬 Evolution</h3>
                <p className="text-sm text-muted-foreground">
                  Best performers are selected each generation and mutated to create improved offspring
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30 border border-accent/20">
                <h3 className="font-semibold text-accent mb-2">🎯 Objective</h3>
                <p className="text-sm text-muted-foreground">
                  Maximize distance traveled and survival time while avoiding collisions with traffic and borders
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 mt-12 py-6 bg-card/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Neural Network Car Simulator - Genetic Algorithm Evolution Demo</p>
        </div>
      </footer>

      {/* Model Manager Dialog */}
      <ModelManager
        open={modelManagerOpen}
        onOpenChange={setModelManagerOpen}
        currentModel={{
          generation: stats.generation,
          bestScore: stats.allTimeBest,
          brainData: null // Would contain actual brain data in full implementation
        }}
        onSave={handleSaveModel}
        onLoad={handleLoadModel}
      />
    </div>
  );
}

export default App;
