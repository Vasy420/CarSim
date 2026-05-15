import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { Play, Pause, RotateCcw, Download, Upload, Database, Gamepad2, Brain } from 'lucide-react';

export const ControlPanel = ({
  isRunning,
  onToggleRun,
  speedMultiplier,
  onSpeedChange,
  showSensors,
  onToggleSensors,
  showNetwork,
  onToggleNetwork,
  onReset,
  onSave,
  onLoad,
  populationSize,
  onPopulationChange,
  controlMode,
  onControlModeChange,
  onOpenModelManager,
  difficulty,
  onDifficultyChange
}) => {
  return (
    <Card className="border-glow-cyan bg-card/50 backdrop-blur-sm">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-glow-cyan">Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Controls */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Simulation</Label>
          <div className="flex gap-2">
            <Button
              onClick={onToggleRun}
              variant="default"
              size="lg"
              className="flex-1 bg-primary hover:bg-primary/80 text-primary-foreground glow-cyan"
            >
              {isRunning ? (
                <>
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start
                </>
              )}
            </Button>
            <Button
              onClick={onReset}
              variant="outline"
              size="lg"
              className="border-primary text-primary hover:bg-primary/20"
            >
              <RotateCcw className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <Separator className="bg-primary/20" />

        {/* Control Mode */}
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Control Mode</Label>
          <div className="grid grid-cols-1 gap-2">
            <Button
              onClick={() => onControlModeChange('MANUAL')}
              variant={controlMode === 'MANUAL' ? 'default' : 'outline'}
              className={controlMode === 'MANUAL' ? 'bg-primary text-primary-foreground' : 'border-primary/30'}
            >
              <Gamepad2 className="mr-2 h-4 w-4" />
              Manual Drive
            </Button>
            <Button
              onClick={() => onControlModeChange('AI_AUTO')}
              variant={controlMode === 'AI_AUTO' ? 'default' : 'outline'}
              className={controlMode === 'AI_AUTO' ? 'bg-primary text-primary-foreground' : 'border-primary/30'}
            >
              <Brain className="mr-2 h-4 w-4" />
              AI Auto
            </Button>
          </div>
          {controlMode === 'MANUAL' && (
            <p className="text-xs text-muted-foreground mt-2">
              Use Arrow Keys or WASD to drive
            </p>
          )}
        </div>

        <Separator className="bg-primary/20" />

        {/* Speed Control */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-foreground font-medium">Traffic Speed</Label>
            <span className="text-primary font-mono text-sm">{speedMultiplier}x</span>
          </div>
          <Slider
            value={[speedMultiplier]}
            onValueChange={(value) => onSpeedChange(value[0])}
            min={0.1}
            max={5}
            step={0.1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0.1x</span>
            <span>5x</span>
          </div>
        </div>

        {/* Population Control - Only show in AI Auto mode */}
        {controlMode === 'AI_AUTO' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-foreground font-medium">Population Size</Label>
              <span className="text-primary font-mono text-sm">{populationSize}</span>
            </div>
            <Slider
              value={[populationSize]}
              onValueChange={(value) => onPopulationChange(value[0])}
              min={10}
              max={200}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>10</span>
              <span>200</span>
            </div>
          </div>
        )}



        <Separator className="bg-primary/20" />

        {/* Difficulty */}
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Difficulty</Label>
          <div className="grid grid-cols-3 gap-2">
            {['easy', 'medium', 'hard'].map(level => (
              <Button
                key={level}
                onClick={() => onDifficultyChange(level)}
                variant={difficulty === level ? 'default' : 'outline'}
                size="sm"
                className={difficulty === level ? 'bg-primary text-primary-foreground' : 'border-primary/30'}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Traffic density: {difficulty === 'easy' ? 'low' : difficulty === 'hard' ? 'high' : 'medium'}
          </p>
        </div>

        <Separator className="bg-primary/20" />

        {/* Visualization Toggles */}
        <div>
          <Label className="text-sm text-muted-foreground mb-3 block">Visualization</Label>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="sensors" className="text-foreground font-medium">Show Sensors</Label>
              <Switch
                id="sensors"
                checked={showSensors}
                onCheckedChange={onToggleSensors}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="network" className="text-foreground font-medium">Show Neural Network</Label>
              <Switch
                id="network"
                checked={showNetwork}
                onCheckedChange={onToggleNetwork}
              />
            </div>
          </div>
        </div>

        <Separator className="bg-primary/20" />

        {/* Model Management */}
        <div>
          <Label className="text-sm text-muted-foreground mb-2 block">Model Management</Label>
          <Button
            onClick={onOpenModelManager}
            variant="outline"
            className="w-full border-secondary text-secondary hover:bg-secondary/20"
          >
            <Database className="mr-2 h-4 w-4" />
            Manage Models
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
