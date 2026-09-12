import { useState } from "react";
import { Compass, Navigation, Radio, X, Building as BuildingIcon, MapPin } from "lucide-react";
import { CAMPUS, CAMPUS_BOUNDS } from "@/game/data/campus";
import { getSceneConfig } from "@/game/scenes/registry";
import { useGameStore } from "@/store/gameStore";
import type { Building } from "@/game/types";
import { Button } from "@/components/ui/button";

export function MapPanel() {
  const setPanel = useGameStore((s) => s.setPanel);
  const scene = useGameStore((s) => s.scene);
  const playerPosition = useGameStore((s) => s.playerPosition);
  const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);

  const isInterior = scene !== "campus";
  const sceneConfig = getSceneConfig(scene);

  // Derive player 2D map coordinates
  const isInsideBuilding = (b: Building) => {
    if (!isInterior) return false;
    if (scene.startsWith(b.id)) return true;
    return false;
  };

  // SVG dimensions
  const minX = -46;
  const maxX = 46;
  const minY = -64;
  const maxY = 56;
  const mapWidth = maxX - minX;
  const mapHeight = maxY - minY;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md p-2 sm:p-6 animate-in fade-in duration-200">
      <div className="holo-panel relative flex h-full max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-primary/30 shadow-2xl">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between border-b border-primary/20 bg-background/60 px-5 py-3.5 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
              <Compass className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold tracking-widest text-primary">
                  TACTICAL CAMPUS NAV-GRID
                </span>
                <span className="rounded bg-primary/20 px-1.5 py-0.5 font-mono text-[10px] text-primary">
                  NAVIGATION ONLY
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Live spatial telemetry & architectural layout
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPanel(null)}
              className="border-primary/30 text-xs font-mono hover:border-primary hover:bg-primary/10"
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Close [M / ESC]
            </Button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
          {/* Map Canvas Area */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#070d14] p-3 sm:p-6">
            {/* Ambient grid overlay */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#1e3a5f_1px,transparent_1px)] [background-size:24px_24px] opacity-25" />

            {/* Cardinal Directions */}
            <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 font-mono text-[11px] font-semibold text-primary/70 tracking-widest flex items-center gap-1">
              <Navigation className="h-3 w-3 rotate-0" /> NORTH (ACADEMIC CORE)
            </div>
            <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 font-mono text-[11px] font-semibold text-muted-foreground/60 tracking-widest">
              SOUTH (MAIN GATE)
            </div>
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 font-mono text-[11px] font-semibold text-muted-foreground/60 tracking-widest -rotate-90">
              WEST
            </div>
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 font-mono text-[11px] font-semibold text-muted-foreground/60 tracking-widest rotate-90">
              EAST
            </div>

            {/* SVG Tactical Map */}
            <svg
              viewBox={`${minX} ${minY} ${mapWidth} ${mapHeight}`}
              className="h-full max-h-[72vh] w-full select-none"
              preserveAspectRatio="xMidYMid meet"
            >
              <defs>
                {/* Tactical glowing pattern */}
                <pattern id="tactical-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#13273e" strokeWidth="0.4" />
                </pattern>
                {/* Glow filter */}
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Grid Background */}
              <rect x={minX} y={minY} width={mapWidth} height={mapHeight} fill="url(#tactical-grid)" />

              {/* Campus Boundary Perimeter */}
              <rect
                x={CAMPUS_BOUNDS.minX}
                y={CAMPUS_BOUNDS.minZ}
                width={CAMPUS_BOUNDS.maxX - CAMPUS_BOUNDS.minX}
                height={CAMPUS_BOUNDS.maxZ - CAMPUS_BOUNDS.minZ}
                fill="none"
                stroke="#1e3a5f"
                strokeWidth="0.5"
                strokeDasharray="2,2"
              />

              {/* Campus Pathways / Walkways */}
              <g stroke="#1a2f48" strokeWidth="2.5" strokeLinecap="round" opacity="0.65">
                {/* Main north-south spine */}
                <line x1="0" y1="46" x2="0" y2="-40" />
                {/* East-west crosswalks */}
                <line x1="-22" y1="2" x2="22" y2="2" />
                <line x1="-20" y1="22" x2="18" y2="22" />
                <line x1="-24" y1="-22" x2="24" y2="-22" />
                {/* Diagonal links */}
                <line x1="0" y1="20" x2="18" y2="22" />
                <line x1="0" y1="0" x2="22" y2="0" />
                <line x1="0" y1="0" x2="-22" y2="2" />
                <line x1="0" y1="-20" x2="24" y2="-22" />
                <line x1="0" y1="-20" x2="0" y2="-14" />
              </g>

              {/* Buildings — Purely Navigation Only */}
              {CAMPUS.map((b) => {
                const [cx, cz] = b.position;
                const [bw, , bd] = b.size;
                const x = cx - bw / 2;
                const y = cz - bd / 2;
                const isSelected = selectedBuilding?.id === b.id;
                const isPlayerInside = isInsideBuilding(b);

                return (
                  <g
                    key={b.id}
                    className="cursor-pointer transition-all duration-200"
                    onClick={() => setSelectedBuilding(b)}
                  >
                    {/* Building Body */}
                    <rect
                      x={x}
                      y={y}
                      width={bw}
                      height={bd}
                      rx="1"
                      fill={
                        isPlayerInside
                          ? "#0c2838"
                          : isSelected
                          ? "#1b2a3f"
                          : b.enterable
                          ? "#121e2e"
                          : "#0e1520"
                      }
                      stroke={
                        isPlayerInside
                          ? "#06b6d4"
                          : isSelected
                          ? "#38bdf8"
                          : b.enterable
                          ? "#334e68"
                          : "#1e293b"
                      }
                      strokeWidth={isSelected || isPlayerInside ? "1.2" : "0.7"}
                    />

                    {/* Exterior Door Indicator */}
                    {b.enterable && (
                      <circle
                        cx={cx + b.door[0]}
                        cy={cz + b.door[1]}
                        r="1"
                        fill="#06b6d4"
                        opacity="0.9"
                      />
                    )}

                    {/* Building Name Label */}
                    <text
                      x={cx}
                      y={cz}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={b.enterable ? "#e2e8f0" : "#64748b"}
                      fontSize={bw > 18 ? "3" : "2.4"}
                      fontWeight="normal"
                      fontFamily="sans-serif"
                      className="pointer-events-none"
                    >
                      {b.name}
                    </text>

                    {/* Inside Badge if Player is in this interior */}
                    {isPlayerInside && (
                      <g transform={`translate(${cx}, ${cz + 3})`}>
                        <rect
                          x="-8"
                          y="-1.4"
                          width="16"
                          height="2.8"
                          rx="0.7"
                          fill="#0891b2"
                        />
                        <text
                          x="0"
                          y="0.3"
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill="#ffffff"
                          fontSize="1.6"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          YOU ARE INSIDE
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Player Position Marker (Only on Campus exterior or outside) */}
              {!isInterior && (
                <g transform={`translate(${playerPosition[0]}, ${playerPosition[2]})`}>
                  {/* Ping animation rings */}
                  <circle
                    r="4.5"
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="0.5"
                    opacity="0.6"
                    className="animate-ping"
                  />
                  <circle
                    r="2.5"
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="0.8"
                    filter="url(#glow)"
                  />
                  {/* Center Dot */}
                  <circle r="1.3" fill="#06b6d4" />
                  {/* Compass pointer heading */}
                  <polygon points="0,-3 -1.2,0 1.2,0" fill="#ffffff" />
                  <text
                    x="0"
                    y="-4.5"
                    textAnchor="middle"
                    fill="#22d3ee"
                    fontSize="2.2"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    YOU
                  </text>
                </g>
              )}
            </svg>
          </div>

          {/* Right-hand Sidebar / Intel Panel */}
          <div className="flex w-full flex-col justify-between border-t border-primary/20 bg-background/80 p-5 backdrop-blur md:w-80 md:border-t-0 md:border-l">
            <div className="space-y-4">
              {/* Navigation Intel Header Card (Spoiler-Free) */}
              <div className="rounded-lg border border-primary/30 bg-primary/10 p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-primary">
                  <MapPin className="h-4 w-4" /> CAMPUS NAVIGATION GRID
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Use this architectural map to locate buildings, campus pathways, and sector entrances. Clues and secret traces must be investigated on foot.
                </p>
              </div>

              {/* Selected Building Details */}
              {selectedBuilding ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <BuildingIcon className="h-3.5 w-3.5" /> SECTOR INTEL
                    </span>
                    <span
                      className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                        selectedBuilding.enterable
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {selectedBuilding.enterable ? "ACCESSIBLE" : "RESTRICTED"}
                    </span>
                  </div>
                  <div className="mt-2 text-base font-bold text-foreground">
                    {selectedBuilding.name}
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs text-muted-foreground font-mono">
                    <div className="flex justify-between">
                      <span>Coordinates:</span>
                      <span className="text-foreground/90">
                        X: {selectedBuilding.position[0]}, Z: {selectedBuilding.position[1]}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="text-foreground/90">
                        {selectedBuilding.size[0]}m × {selectedBuilding.size[2]}m
                      </span>
                    </div>
                    {selectedBuilding.enterable && (
                      <div className="flex justify-between">
                        <span>Door Facade:</span>
                        <span className="text-cyan-400">
                          {selectedBuilding.door[0] < 0
                            ? "West Facing"
                            : selectedBuilding.door[0] > 0
                            ? "East Facing"
                            : selectedBuilding.door[1] < 0
                            ? "North Facing"
                            : "South Facing"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-border/50 bg-background/40 p-4 text-center">
                  <Radio className="mx-auto h-5 w-5 text-muted-foreground/60" />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Click any sector or facility on the tactical grid to inspect dimensions, door coordinates, and accessibility status.
                  </p>
                </div>
              )}

              {/* Player Telemetry Card */}
              <div className="rounded-lg border border-border/60 bg-background/50 p-3 text-xs">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="font-mono text-[10px] uppercase tracking-wider">
                    Agent Location Telemetry
                  </span>
                  <span className="flex items-center gap-1 text-primary">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="mt-2 font-display text-sm text-foreground">
                  {sceneConfig.locationLabel}
                </div>
                <div className="mt-1 font-mono text-[11px] text-muted-foreground">
                  Position: [{playerPosition[0].toFixed(1)}, {playerPosition[2].toFixed(1)}]
                </div>
              </div>
            </div>

            {/* Map Legend & Actions */}
            <div className="mt-4 border-t border-border/50 pt-4">
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" /> Player Position
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 opacity-90" /> Entrance Door
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#334e68]" /> Accessible Sector
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-sm bg-[#1e293b]" /> Restricted Area
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  className="w-full"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPanel(null)}
                >
                  Return to Mission
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
