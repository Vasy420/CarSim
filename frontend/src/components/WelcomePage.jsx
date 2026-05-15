import { useEffect } from 'react';

const CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --blue:   #5b8dee;
    --purple: #9373e8;
    --teal:   #2ec4a3;
    --amber:  #e8a83a;
    --glass-bg:           rgba(255,255,255,0.032);
    --glass-border:       rgba(255,255,255,0.072);
    --glass-border-hover: rgba(255,255,255,0.13);
    --text-primary:   #eceef6;
    --text-secondary: rgba(220,224,240,0.42);
    --text-muted:     rgba(200,206,228,0.22);
    --ease-spring: cubic-bezier(0.34,1.56,0.64,1);
    --ease-out:    cubic-bezier(0.16,1,0.3,1);
  }

  #wp-root { scroll-behavior: smooth; }

  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: #04060f; }
  ::-webkit-scrollbar-thumb { background: rgba(91,141,238,0.22); border-radius: 3px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(91,141,238,0.42); }

  #loader {
    position: fixed; inset: 0; z-index: 9999;
    background: #04060f;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 32px;
    transition: opacity 0.7s var(--ease-out), visibility 0.7s;
  }
  #loader.done { opacity: 0; visibility: hidden; pointer-events: none; }

  .loader-logo {
    font-size: 2.8rem; font-weight: 900; letter-spacing: -0.05em;
    background: linear-gradient(118deg, #c8d8ff 0%, #a5b8ff 45%, #e0b8ff 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
    opacity: 0; transform: translateY(12px);
    animation: loaderIn 0.7s 0.2s var(--ease-out) forwards;
  }
  @keyframes loaderIn { to { opacity: 1; transform: translateY(0); } }

  .loader-track {
    width: 180px; height: 1px;
    background: rgba(255,255,255,0.07);
    border-radius: 1px; overflow: hidden;
    opacity: 0; animation: loaderIn 0.5s 0.5s ease forwards;
  }
  .loader-fill {
    height: 100%; width: 0%; border-radius: 1px;
    background: linear-gradient(90deg, var(--blue), var(--purple));
    box-shadow: 0 0 8px rgba(91,141,238,0.6);
    animation: loaderBar 1.6s 0.6s var(--ease-out) forwards;
  }
  @keyframes loaderBar { to { width: 100%; } }

  .loader-text {
    font-size: 0.7rem; letter-spacing: 0.14em; text-transform: uppercase;
    color: rgba(180,190,220,0.25); font-weight: 500;
    opacity: 0; animation: loaderIn 0.5s 0.6s ease forwards;
  }

  #cursor-dot, #cursor-ring {
    position: fixed; pointer-events: none; z-index: 9998;
    border-radius: 50%; transform: translate(-50%,-50%);
    will-change: transform;
  }
  #cursor-dot {
    width: 5px; height: 5px;
    background: rgba(91,141,238,0.9);
    transition: width 0.2s, height 0.2s, background 0.2s;
  }
  #cursor-ring {
    width: 28px; height: 28px;
    border: 1px solid rgba(91,141,238,0.3);
    transition: width 0.3s var(--ease-spring), height 0.3s var(--ease-spring),
                border-color 0.3s, opacity 0.3s;
    opacity: 0.7;
  }
  body.cursor-hover #cursor-dot  { width: 8px; height: 8px; background: rgba(147,115,232,0.95); }
  body.cursor-hover #cursor-ring { width: 44px; height: 44px; border-color: rgba(147,115,232,0.35); opacity: 0.5; }
  body.cursor-click #cursor-ring { width: 20px; height: 20px; opacity: 1; border-color: rgba(91,141,238,0.7); }

  #hero-canvas {
    position: absolute; inset: 0; width: 100%; height: 100%;
    pointer-events: none; z-index: 0;
  }
  .wp-orb {
    position: absolute; border-radius: 50%;
    filter: blur(140px); opacity: 0.11; pointer-events: none;
    will-change: transform;
  }
  .wp-orb-1 { width: 780px; height: 780px; background: var(--blue);   top: -260px; left: -180px; animation: orbDrift1 18s ease-in-out infinite; }
  .wp-orb-2 { width: 520px; height: 520px; background: var(--purple); top:  80px;  right:-130px; animation: orbDrift2 22s ease-in-out infinite; }
  .wp-orb-3 { width: 380px; height: 380px; background: var(--teal);   bottom:-80px; left:42%; opacity:0.07; }
  @keyframes orbDrift1 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(40px,30px); } }
  @keyframes orbDrift2 { 0%,100% { transform:translate(0,0); } 50% { transform:translate(-30px,20px); } }

  .glass {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    backdrop-filter: blur(24px) saturate(160%);
    -webkit-backdrop-filter: blur(24px) saturate(160%);
  }

  .gradient-text {
    background: linear-gradient(118deg, #c8d8ff 0%, #a5b8ff 35%, #c4aeff 68%, #e0b8ff 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .title-glow { filter: drop-shadow(0 0 48px rgba(130,160,255,0.18)); }

  .btn-primary {
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, rgba(91,141,238,0.9) 0%, rgba(147,115,232,0.9) 100%);
    border-radius: 100px; padding: 15px 46px;
    font-weight: 600; font-size: 0.925rem; letter-spacing: 0.025em;
    color: rgba(255,255,255,0.96); cursor: none; border: none;
    transition: transform 0.3s var(--ease-spring), box-shadow 0.3s ease;
    box-shadow: 0 2px 24px rgba(91,141,238,0.28), 0 1px 0 rgba(255,255,255,0.12) inset;
  }
  .btn-primary::before {
    content:''; position:absolute; inset:0;
    background: linear-gradient(135deg, rgba(120,165,255,0.95), rgba(175,140,255,0.95));
    opacity: 0; transition: opacity 0.22s;
  }
  .btn-primary::after {
    content:''; position:absolute;
    top:0; left:-100%; width:55%; height:100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
    transition: left 0.55s ease;
  }
  .btn-primary:hover { transform: translateY(-3px) scale(1.03); box-shadow: 0 10px 44px rgba(91,141,238,0.42), 0 1px 0 rgba(255,255,255,0.12) inset; }
  .btn-primary:hover::before { opacity: 1; }
  .btn-primary:hover::after  { left: 160%; }
  .btn-primary:active { transform: translateY(0) scale(0.975) !important; transition-duration: 0.1s; }
  .btn-primary span { position: relative; z-index: 1; }
  .btn-primary .ripple {
    position: absolute; border-radius: 50%;
    background: rgba(255,255,255,0.25);
    transform: scale(0); pointer-events: none;
    animation: rippleOut 0.55s ease forwards;
  }
  @keyframes rippleOut { to { transform: scale(4); opacity: 0; } }

  .btn-secondary {
    border-radius: 100px; padding: 14px 38px;
    font-weight: 500; font-size: 0.9rem; letter-spacing: 0.02em;
    color: rgba(200,210,240,0.65); cursor: none;
    border: 1px solid rgba(255,255,255,0.1);
    background: rgba(255,255,255,0.026);
    transition: all 0.28s var(--ease-spring);
    position: relative; overflow: hidden;
  }
  .btn-secondary:hover {
    background: rgba(255,255,255,0.055);
    border-color: rgba(255,255,255,0.2);
    color: rgba(220,228,255,0.9);
    transform: translateY(-2px);
  }
  .btn-secondary:active { transform: translateY(0) scale(0.975) !important; transition-duration: 0.1s; }

  .feature-card {
    border-radius: 22px; padding: 40px 36px;
    transition: box-shadow 0.38s ease, border-color 0.3s ease;
    cursor: none; position: relative; overflow: hidden;
    transform-style: preserve-3d; will-change: transform;
  }
  .feature-card::before {
    content:''; position:absolute;
    top:0; left:20%; right:20%; height:1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent);
  }
  .feature-card::after {
    content:''; position:absolute; inset:0;
    background: radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,255,255,0.035), transparent 70%);
    opacity:0; transition: opacity 0.32s; border-radius:22px; pointer-events: none;
  }
  .feature-card:hover { box-shadow: 0 32px 72px rgba(0,0,0,0.55), 0 0 0 1px var(--glass-border-hover); }
  .feature-card:hover::after { opacity: 1; }

  .icon-wrap {
    width:50px; height:50px; border-radius:14px;
    display:flex; align-items:center; justify-content:center;
    font-size:22px; margin-bottom:22px;
    transition: transform 0.35s var(--ease-spring);
  }
  .feature-card:hover .icon-wrap { transform: scale(1.12) rotate(-4deg); }

  .stat-bar { height:2px; border-radius:2px; overflow:hidden; background: rgba(255,255,255,0.06); }
  .stat-fill { height:100%; border-radius:2px; transition: width 1.9s cubic-bezier(0.16,1,0.3,1); width:0%; }

  .showcase-wrap { border-radius:26px; overflow:hidden; position:relative; }
  .showcase-screen {
    background: linear-gradient(160deg, #0a1122 0%, #080e1c 40%, #050910 100%);
    border-radius:22px; aspect-ratio:16/9; position:relative; overflow:hidden;
  }
  .showcase-outer {
    border-radius:28px; padding:1px;
    background: linear-gradient(135deg, rgba(91,141,238,0.25), rgba(147,115,232,0.15), rgba(91,141,238,0.08));
    box-shadow: 0 0 0 1px rgba(255,255,255,0.04), 0 40px 80px rgba(0,0,0,0.55), 0 0 60px rgba(91,141,238,0.07);
    transition: box-shadow 0.4s ease;
  }
  .showcase-outer:hover {
    box-shadow: 0 0 0 1px rgba(255,255,255,0.07), 0 50px 100px rgba(0,0,0,0.6), 0 0 80px rgba(91,141,238,0.12);
  }
  .scan-line {
    position:absolute; left:0; right:0; height:1px;
    background: linear-gradient(90deg, transparent 0%, rgba(91,141,238,0.35) 40%, rgba(147,115,232,0.35) 60%, transparent 100%);
    animation: scan 4s ease-in-out infinite;
  }
  @keyframes scan {
    0%   { top:0%;   opacity:0; }
    8%   { opacity:1; }
    92%  { opacity:1; }
    100% { top:100%; opacity:0; }
  }

  .section-glow-line {
    height: 1px; margin: 0 5%;
    position: relative; overflow: hidden;
    background: rgba(255,255,255,0.035);
  }
  .section-glow-line::after {
    content:''; position:absolute;
    top:0; left:-100%; width:100%; height:100%;
    background: linear-gradient(90deg, transparent, rgba(91,141,238,0.5), rgba(147,115,232,0.4), transparent);
    transition: left 1s var(--ease-out);
  }
  .section-glow-line.drawn::after { left: 100%; }

  #main-nav { transition: padding 0.4s ease, background 0.4s ease, box-shadow 0.4s ease; }
  #main-nav.scrolled {
    padding-top: 12px !important; padding-bottom: 12px !important;
    background: rgba(4,6,15,0.92) !important;
    box-shadow: 0 1px 0 rgba(255,255,255,0.05), 0 8px 32px rgba(0,0,0,0.4);
  }

  .nav-link {
    color: rgba(210,218,240,0.45);
    font-size: 0.875rem; font-weight: 450;
    text-decoration: none; letter-spacing: 0.015em;
    transition: color 0.2s; position: relative; cursor: none;
  }
  .nav-link::after {
    content:''; position:absolute;
    bottom:-4px; left:0; right:0; height:1px;
    background: var(--blue); transform: scaleX(0);
    transition: transform 0.24s var(--ease-out); transform-origin: left;
  }
  .nav-link:hover { color: rgba(230,235,255,0.9); }
  .nav-link:hover::after { transform: scaleX(1); }

  .reveal { opacity:0; transform:translateY(28px); transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out); }
  .reveal-left  { opacity:0; transform:translateX(-28px); transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out); }
  .reveal-scale { opacity:0; transform:scale(0.93); transition: opacity 0.8s var(--ease-out), transform 0.8s var(--ease-out); }
  .reveal.visible, .reveal-left.visible, .reveal-scale.visible { opacity:1; transform:none; }
  .reveal-delay-1 { transition-delay: 0.07s; }
  .reveal-delay-2 { transition-delay: 0.14s; }
  .reveal-delay-3 { transition-delay: 0.21s; }
  .reveal-delay-4 { transition-delay: 0.28s; }

  .hero-fade { animation: heroFade 1.1s var(--ease-out) forwards; }
  .hero-fade-1 { animation-delay:0.15s; opacity:0; }
  .hero-fade-2 { animation-delay:0.40s; opacity:0; }
  .hero-fade-3 { animation-delay:0.65s; opacity:0; }
  .hero-fade-4 { animation-delay:0.88s; opacity:0; }
  @keyframes heroFade {
    from { opacity:0; transform:translateY(18px); }
    to   { opacity:1; transform:translateY(0); }
  }

  .badge-pill {
    display:inline-flex; align-items:center; gap:7px;
    border-radius:100px; padding:6px 15px;
    font-size:0.72rem; font-weight:550; letter-spacing:0.07em; text-transform:uppercase;
    transition: transform 0.3s var(--ease-spring), border-color 0.3s;
  }
  .badge-pill:hover { transform: scale(1.04); }
  .badge-dot {
    width:5px; height:5px; border-radius:50%; background:var(--blue);
    animation: blink 2s ease-in-out infinite;
    box-shadow: 0 0 6px rgba(91,141,238,0.7);
  }
  @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.25;} }

  .bg-grid {
    position:absolute; inset:0;
    background-image:
      linear-gradient(rgba(91,141,238,0.036) 1px, transparent 1px),
      linear-gradient(90deg, rgba(91,141,238,0.036) 1px, transparent 1px);
    background-size: 72px 72px;
    mask-image: radial-gradient(ellipse 75% 70% at 50% 50%, black 10%, transparent 100%);
  }

  .metric-card {
    border-radius:18px; padding:32px 28px;
    text-align:center; position:relative; overflow:hidden;
    transition: transform 0.35s var(--ease-spring), box-shadow 0.35s ease;
  }
  .metric-card:hover { transform: translateY(-6px) scale(1.02); box-shadow: 0 24px 52px rgba(0,0,0,0.44); }
  .metric-card::before {
    content:''; position:absolute;
    top:0; left:20%; right:20%; height:1px; border-radius:1px;
  }
  .metric-card:nth-child(1)::before { background:linear-gradient(90deg,transparent,rgba(91,141,238,0.5),transparent); }
  .metric-card:nth-child(2)::before { background:linear-gradient(90deg,transparent,rgba(147,115,232,0.5),transparent); }
  .metric-card:nth-child(3)::before { background:linear-gradient(90deg,transparent,rgba(46,196,163,0.5),transparent); }
  .metric-card:nth-child(4)::before { background:linear-gradient(90deg,transparent,rgba(232,168,58,0.5),transparent); }

  .footer-link {
    color: rgba(190,200,228,0.28); font-size:0.8rem;
    text-decoration:none; letter-spacing:0.01em;
    position:relative; cursor:none; transition: color 0.22s;
  }
  .footer-link::after {
    content:''; position:absolute;
    bottom:-2px; left:0; width:0; height:1px;
    background: rgba(91,141,238,0.5);
    transition: width 0.28s var(--ease-out);
  }
  .footer-link:hover { color: rgba(210,220,245,0.65); }
  .footer-link:hover::after { width: 100%; }

  .scroll-indicator { animation: scrollBounce 2.2s ease-in-out infinite; }
  @keyframes scrollBounce {
    0%,100% { transform:translateY(0); opacity:0.45; }
    50%      { transform:translateY(7px); opacity:0.8; }
  }

  .hero-stat-divider { width:1px; background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), transparent); }

  .hud-glass {
    background: rgba(8,12,26,0.72);
    border: 1px solid rgba(255,255,255,0.07);
    backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  }

  #scroll-progress {
    position: fixed; top: 0; left: 0; height: 2px; width: 0%;
    background: linear-gradient(90deg, var(--blue), var(--purple));
    z-index: 10000; transition: width 0.08s linear;
    box-shadow: 0 0 8px rgba(91,141,238,0.5);
  }

  .hero-title-wrap { position: relative; display:inline-block; }

  /* nav layout */
  #main-nav { display: flex; align-items: center; justify-content: space-between; }
  .wp-nav-links { display: none; align-items: center; gap: 2.25rem; }
  @media (min-width: 768px) { .wp-nav-links { display: flex; } }
`;

const HTML = `
<div id="loader">
  <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
    <div class="loader-logo">CarSim</div>
    <div class="loader-text">Initialising simulation engine</div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:center;gap:10px;">
    <div class="loader-track"><div class="loader-fill"></div></div>
  </div>
</div>

<div id="scroll-progress"></div>
<div id="cursor-ring"></div>
<div id="cursor-dot"></div>

<nav id="main-nav" class="fixed top-0 left-0 right-0 z-50"
     style="padding:18px 40px;background:rgba(4,6,15,0.75);backdrop-filter:blur(28px) saturate(180%);border-bottom:1px solid rgba(255,255,255,0.045);">

  <div style="display:flex;align-items:center;gap:10px;">
    <div style="width:30px;height:30px;background:linear-gradient(138deg,var(--blue),var(--purple));border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 14px rgba(91,141,238,0.32);transition:transform 0.3s var(--ease-spring),box-shadow 0.3s;"
         onmouseenter="this.style.transform='scale(1.1) rotate(-5deg)';this.style.boxShadow='0 4px 22px rgba(91,141,238,0.5)'"
         onmouseleave="this.style.transform='';this.style.boxShadow='0 2px 14px rgba(91,141,238,0.32)'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 17H5M19 17a2 2 0 002-2v-4a2 2 0 00-.586-1.414L17 6H7L3.586 9.586A2 2 0 003 11v4a2 2 0 002 2M19 17l1 4H4l1-4"/>
        <circle cx="7.5" cy="17" r="0.5" stroke="white" fill="white"/>
        <circle cx="16.5" cy="17" r="0.5" stroke="white" fill="white"/>
      </svg>
    </div>
    <span style="font-weight:750;font-size:1.05rem;letter-spacing:-0.025em;color:rgba(235,240,255,0.95);">CarSim</span>
  </div>

  <div class="wp-nav-links">
    <a href="#wp-features" class="nav-link">Features</a>
    <a href="#wp-showcase" class="nav-link">Showcase</a>
    <a href="#wp-metrics"  class="nav-link">Metrics</a>
  </div>

  <button class="btn-primary start-sim-btn" style="padding:9px 24px;font-size:0.82rem;letter-spacing:0.02em;">
    <span>Get Started</span>
  </button>
</nav>


<section id="wp-hero" style="min-height:100vh;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;padding-top:80px;">
  <canvas id="hero-canvas"></canvas>
  <div class="wp-orb wp-orb-1" id="orb1"></div>
  <div class="wp-orb wp-orb-2" id="orb2"></div>
  <div class="wp-orb wp-orb-3"></div>
  <div class="bg-grid"></div>

  <div style="position:relative;z-index:2;text-align:center;max-width:820px;padding:0 28px;">
    <div class="hero-fade hero-fade-1" style="margin-bottom:28px;">
      <span class="badge-pill glass" style="color:rgba(200,212,245,0.6);">
        <span class="badge-dot"></span>
        Neural Evolution — Version 2.4
      </span>
    </div>

    <div class="hero-title-wrap">
      <h1 class="hero-fade hero-fade-2 gradient-text title-glow"
          style="font-size:clamp(4rem,9vw,7.5rem);font-weight:900;line-height:0.92;letter-spacing:-0.05em;margin-bottom:28px;">
        Car Sim
      </h1>
    </div>

    <p class="hero-fade hero-fade-3"
       style="font-size:clamp(1.05rem,2.2vw,1.3rem);color:rgba(200,210,240,0.52);font-weight:300;letter-spacing:0.01em;line-height:1.65;margin-bottom:14px;">
      AI-powered autonomous driving simulation
    </p>
    <p class="hero-fade hero-fade-3"
       style="font-size:clamp(0.875rem,1.6vw,1rem);color:rgba(180,190,220,0.28);max-width:520px;margin:0 auto 52px;line-height:1.75;font-weight:350;">
      Train neural networks, evolve intelligent agents, and simulate real-world driving scenarios at scale — all in your browser.
    </p>

    <div class="hero-fade hero-fade-4" style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
      <button class="btn-primary start-sim-btn"><span>&#9654;&nbsp; Start Simulation</span></button>
      <button class="btn-secondary">View Demo</button>
    </div>

    <div class="hero-fade hero-fade-4"
         style="margin-top:72px;display:flex;justify-content:center;align-items:center;gap:52px;flex-wrap:wrap;">
      <div style="text-align:center;">
        <div style="font-size:1.75rem;font-weight:800;color:rgba(235,240,255,0.95);letter-spacing:-0.03em;">12M+</div>
        <div style="font-size:0.72rem;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin-top:5px;font-weight:450;">Simulations Run</div>
      </div>
      <div class="hero-stat-divider" style="height:36px;"></div>
      <div style="text-align:center;">
        <div style="font-size:1.75rem;font-weight:800;color:rgba(235,240,255,0.95);letter-spacing:-0.03em;">99.7%</div>
        <div style="font-size:0.72rem;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin-top:5px;font-weight:450;">Navigation Accuracy</div>
      </div>
      <div class="hero-stat-divider" style="height:36px;"></div>
      <div style="text-align:center;">
        <div style="font-size:1.75rem;font-weight:800;color:rgba(235,240,255,0.95);letter-spacing:-0.03em;">0.8ms</div>
        <div style="font-size:0.72rem;color:var(--text-muted);letter-spacing:0.08em;text-transform:uppercase;margin-top:5px;font-weight:450;">Avg. Inference Time</div>
      </div>
    </div>
  </div>

  <div class="scroll-indicator" style="position:absolute;bottom:38px;left:50%;transform:translateX(-50%);z-index:2;display:flex;flex-direction:column;align-items:center;gap:7px;">
    <span style="font-size:0.65rem;color:rgba(180,190,220,0.22);letter-spacing:0.12em;text-transform:uppercase;font-weight:500;">Scroll</span>
    <svg width="14" height="18" viewBox="0 0 14 18" fill="none" stroke="rgba(180,190,220,0.22)" stroke-width="1.5" stroke-linecap="round">
      <path d="M7 2v14M1 10l6 6 6-6"/>
    </svg>
  </div>
</section>


<div class="section-glow-line"></div>


<section id="wp-features" style="padding:136px 28px;max-width:1200px;margin:0 auto;">
  <div class="reveal" style="text-align:center;margin-bottom:80px;">
    <div class="badge-pill glass" style="color:rgba(190,202,235,0.45);margin-bottom:22px;">Core Capabilities</div>
    <h2 style="font-size:clamp(2rem,3.8vw,3rem);font-weight:800;letter-spacing:-0.035em;line-height:1.08;margin-bottom:18px;color:rgba(235,240,255,0.96);">
      Built for the future of<br/><span class="gradient-text">autonomous intelligence</span>
    </h2>
    <p style="font-size:0.95rem;color:var(--text-secondary);max-width:440px;margin:0 auto;line-height:1.75;font-weight:350;">
      Every feature engineered to push the boundaries of what AI-driven vehicles can learn and achieve.
    </p>
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(268px,1fr));gap:18px;">

    <div class="feature-card glass reveal reveal-delay-1">
      <div class="icon-wrap" style="background:linear-gradient(138deg,rgba(91,141,238,0.16),rgba(91,141,238,0.04));border:1px solid rgba(91,141,238,0.18);">&#129504;</div>
      <h3 style="font-size:1.08rem;font-weight:680;margin-bottom:11px;letter-spacing:-0.015em;color:rgba(228,234,255,0.9);">Neural Network Driving</h3>
      <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.75;font-weight:350;">
        Deep neural architectures process sensor data in real-time, enabling precise steering, braking, and navigation decisions.
      </p>
      <div style="margin-top:28px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <span style="font-size:0.68rem;color:var(--text-muted);letter-spacing:0.07em;text-transform:uppercase;font-weight:500;">Model Accuracy</span>
          <span style="font-size:0.78rem;color:rgba(200,212,240,0.4);font-weight:500;">92%</span>
        </div>
        <div class="stat-bar"><div class="stat-fill" style="background:linear-gradient(90deg,var(--blue),var(--purple));" data-width="92"></div></div>
      </div>
    </div>

    <div class="feature-card glass reveal reveal-delay-2">
      <div class="icon-wrap" style="background:linear-gradient(138deg,rgba(147,115,232,0.16),rgba(147,115,232,0.04));border:1px solid rgba(147,115,232,0.18);">&#129516;</div>
      <h3 style="font-size:1.08rem;font-weight:680;margin-bottom:11px;letter-spacing:-0.015em;color:rgba(228,234,255,0.9);">Evolutionary Learning</h3>
      <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.75;font-weight:350;">
        NEAT-powered genetic algorithms evolve entire populations of AI drivers across generations, selecting the best survivors.
      </p>
      <div style="margin-top:28px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <span style="font-size:0.68rem;color:var(--text-muted);letter-spacing:0.07em;text-transform:uppercase;font-weight:500;">Evolution Rate</span>
          <span style="font-size:0.78rem;color:rgba(200,212,240,0.4);font-weight:500;">78%</span>
        </div>
        <div class="stat-bar"><div class="stat-fill" style="background:linear-gradient(90deg,var(--purple),#c47fef);" data-width="78"></div></div>
      </div>
    </div>

    <div class="feature-card glass reveal reveal-delay-3">
      <div class="icon-wrap" style="background:linear-gradient(138deg,rgba(46,196,163,0.16),rgba(46,196,163,0.04));border:1px solid rgba(46,196,163,0.18);">&#9889;</div>
      <h3 style="font-size:1.08rem;font-weight:680;margin-bottom:11px;letter-spacing:-0.015em;color:rgba(228,234,255,0.9);">Real-time Simulation</h3>
      <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.75;font-weight:350;">
        Physics-accurate environment running at 60fps with multi-lane traffic, obstacles, and dynamic driving conditions.
      </p>
      <div style="margin-top:28px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <span style="font-size:0.68rem;color:var(--text-muted);letter-spacing:0.07em;text-transform:uppercase;font-weight:500;">Simulation FPS</span>
          <span style="font-size:0.78rem;color:rgba(200,212,240,0.4);font-weight:500;">60fps</span>
        </div>
        <div class="stat-bar"><div class="stat-fill" style="background:linear-gradient(90deg,var(--teal),var(--blue));" data-width="96"></div></div>
      </div>
    </div>

    <div class="feature-card glass reveal reveal-delay-4">
      <div class="icon-wrap" style="background:linear-gradient(138deg,rgba(232,168,58,0.16),rgba(232,168,58,0.04));border:1px solid rgba(232,168,58,0.18);">&#128225;</div>
      <h3 style="font-size:1.08rem;font-weight:680;margin-bottom:11px;letter-spacing:-0.015em;color:rgba(228,234,255,0.9);">Sensor Fusion</h3>
      <p style="font-size:0.86rem;color:var(--text-secondary);line-height:1.75;font-weight:350;">
        7-ray LiDAR sensor arrays feed fused perception data into the AI pipeline for complete spatial awareness.
      </p>
      <div style="margin-top:28px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
          <span style="font-size:0.68rem;color:var(--text-muted);letter-spacing:0.07em;text-transform:uppercase;font-weight:500;">Sensor Coverage</span>
          <span style="font-size:0.78rem;color:rgba(200,212,240,0.4);font-weight:500;">360&#176;</span>
        </div>
        <div class="stat-bar"><div class="stat-fill" style="background:linear-gradient(90deg,var(--amber),#e07844);" data-width="88"></div></div>
      </div>
    </div>

  </div>
</section>


<div class="section-glow-line"></div>


<section id="wp-showcase" style="padding:136px 28px;max-width:1100px;margin:0 auto;">
  <div class="reveal" style="text-align:center;margin-bottom:64px;">
    <div class="badge-pill glass" style="color:rgba(190,202,235,0.45);margin-bottom:22px;">Live Preview</div>
    <h2 style="font-size:clamp(2rem,3.8vw,3rem);font-weight:800;letter-spacing:-0.035em;line-height:1.08;margin-bottom:18px;color:rgba(235,240,255,0.96);">
      Watch the AI<br/><span class="gradient-text">think and drive</span>
    </h2>
    <p style="font-size:0.92rem;color:var(--text-secondary);max-width:420px;margin:0 auto;line-height:1.75;font-weight:350;">
      Real-time neural network visualization overlaid on the driving simulation. Watch neurons fire as the car navigates.
    </p>
  </div>

  <div class="reveal-scale showcase-outer">
    <div class="showcase-wrap">
      <div class="showcase-screen">
        <div class="scan-line"></div>
        <canvas id="sim-canvas" style="position:absolute;inset:0;width:100%;height:100%;"></canvas>

        <div style="position:absolute;top:18px;left:18px;z-index:2;">
          <div class="hud-glass" style="border-radius:12px;padding:13px 17px;min-width:152px;">
            <div style="font-size:0.62rem;color:rgba(91,141,238,0.7);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;font-weight:550;">Neural Activity</div>
            <div id="hud-score" style="font-size:1.55rem;font-weight:800;color:rgba(230,236,255,0.95);line-height:1;letter-spacing:-0.03em;">0</div>
            <div style="font-size:0.67rem;color:rgba(180,190,220,0.3);margin-top:3px;font-weight:400;">fitness score</div>
          </div>
        </div>

        <div style="position:absolute;top:18px;right:18px;z-index:2;">
          <div class="hud-glass" style="border-radius:12px;padding:13px 17px;">
            <div style="font-size:0.62rem;color:rgba(147,115,232,0.7);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:8px;font-weight:550;">Generation</div>
            <div id="hud-gen" style="font-size:1.55rem;font-weight:800;color:rgba(230,236,255,0.95);line-height:1;letter-spacing:-0.03em;">001</div>
            <div style="font-size:0.67rem;color:rgba(180,190,220,0.3);margin-top:3px;font-weight:400;">evolving...</div>
          </div>
        </div>

        <div style="position:absolute;bottom:18px;left:18px;right:18px;z-index:2;display:flex;gap:10px;align-items:flex-end;justify-content:space-between;">
          <div class="hud-glass" style="border-radius:10px;padding:10px 16px;display:flex;gap:22px;">
            <div>
              <div style="font-size:0.58rem;color:rgba(180,190,220,0.28);text-transform:uppercase;letter-spacing:0.08em;font-weight:500;">Speed</div>
              <div id="hud-speed" style="font-size:0.95rem;font-weight:700;color:var(--blue);letter-spacing:-0.01em;">72 km/h</div>
            </div>
            <div style="width:1px;background:rgba(255,255,255,0.06);"></div>
            <div>
              <div style="font-size:0.58rem;color:rgba(180,190,220,0.28);text-transform:uppercase;letter-spacing:0.08em;font-weight:500;">Alive</div>
              <div id="hud-alive" style="font-size:0.95rem;font-weight:700;color:var(--teal);letter-spacing:-0.01em;">48 / 50</div>
            </div>
          </div>
          <div class="hud-glass" style="border-radius:10px;padding:10px 16px;">
            <div style="display:flex;align-items:center;gap:8px;">
              <div style="width:6px;height:6px;border-radius:50%;background:var(--teal);animation:blink 1.4s ease-in-out infinite;box-shadow:0 0 6px rgba(46,196,163,0.6);"></div>
              <span style="font-size:0.7rem;color:rgba(180,190,220,0.38);font-weight:550;letter-spacing:0.07em;">SIMULATING</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>


<div class="section-glow-line"></div>


<section id="wp-metrics" style="padding:112px 28px;max-width:1100px;margin:0 auto;">
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;">
    <div class="metric-card glass reveal reveal-delay-1">
      <div style="font-size:2.35rem;font-weight:850;letter-spacing:-0.04em;background:linear-gradient(130deg,rgba(165,184,255,0.95),rgba(91,141,238,0.85));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">12M+</div>
      <div style="font-size:0.88rem;font-weight:560;color:rgba(210,218,240,0.52);margin-top:7px;">Simulations Run</div>
      <div style="font-size:0.74rem;color:var(--text-muted);margin-top:4px;font-weight:350;">Across all users globally</div>
    </div>
    <div class="metric-card glass reveal reveal-delay-2">
      <div style="font-size:2.35rem;font-weight:850;letter-spacing:-0.04em;background:linear-gradient(130deg,rgba(196,175,255,0.95),rgba(147,115,232,0.85));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">99.7%</div>
      <div style="font-size:0.88rem;font-weight:560;color:rgba(210,218,240,0.52);margin-top:7px;">Navigation Accuracy</div>
      <div style="font-size:0.74rem;color:var(--text-muted);margin-top:4px;font-weight:350;">Best-in-class AI performance</div>
    </div>
    <div class="metric-card glass reveal reveal-delay-3">
      <div style="font-size:2.35rem;font-weight:850;letter-spacing:-0.04em;background:linear-gradient(130deg,rgba(150,230,210,0.95),rgba(46,196,163,0.85));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">60fps</div>
      <div style="font-size:0.88rem;font-weight:560;color:rgba(210,218,240,0.52);margin-top:7px;">Realtime Physics</div>
      <div style="font-size:0.74rem;color:var(--text-muted);margin-top:4px;font-weight:350;">Zero-lag simulation engine</div>
    </div>
    <div class="metric-card glass reveal reveal-delay-4">
      <div style="font-size:2.35rem;font-weight:850;letter-spacing:-0.04em;background:linear-gradient(130deg,rgba(255,218,140,0.95),rgba(232,168,58,0.85));-webkit-background-clip:text;-webkit-text-fill-color:transparent;">0.8ms</div>
      <div style="font-size:0.88rem;font-weight:560;color:rgba(210,218,240,0.52);margin-top:7px;">Inference Latency</div>
      <div style="font-size:0.74rem;color:var(--text-muted);margin-top:4px;font-weight:350;">Optimized for real-time AI</div>
    </div>
  </div>
</section>


<div class="section-glow-line"></div>


<section style="padding:160px 28px;text-align:center;position:relative;overflow:hidden;">
  <div class="wp-orb" style="width:560px;height:360px;background:linear-gradient(135deg,var(--blue),var(--purple));top:50%;left:50%;transform:translate(-50%,-50%);opacity:0.08;filter:blur(110px);"></div>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(4,6,15,0.55) 100%);pointer-events:none;"></div>
  <div style="position:relative;z-index:1;">
    <h2 class="reveal" style="font-size:clamp(2.2rem,5vw,3.8rem);font-weight:850;letter-spacing:-0.045em;line-height:1.04;margin-bottom:22px;color:rgba(235,240,255,0.96);">
      Ready to simulate<br/><span class="gradient-text">the future of driving?</span>
    </h2>
    <p class="reveal" style="font-size:0.96rem;color:var(--text-secondary);max-width:400px;margin:0 auto 52px;line-height:1.75;font-weight:350;">
      Jump into the simulator and watch your neural network evolve across generations of autonomous drivers.
    </p>
    <div class="reveal" style="display:flex;align-items:center;justify-content:center;gap:14px;flex-wrap:wrap;">
      <button class="btn-primary start-sim-btn" style="padding:17px 52px;font-size:1rem;"><span>&#9654;&nbsp; Start Simulation</span></button>
    </div>
  </div>
</section>


<footer style="border-top:1px solid rgba(255,255,255,0.05);padding:44px 52px 36px;">
  <div style="max-width:1100px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:24px;">
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="width:26px;height:26px;background:linear-gradient(138deg,var(--blue),var(--purple));border-radius:7px;display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
          <path d="M19 17H5M19 17a2 2 0 002-2v-4a2 2 0 00-.586-1.414L17 6H7L3.586 9.586A2 2 0 003 11v4a2 2 0 002 2M19 17l1 4H4l1-4"/>
        </svg>
      </div>
      <span style="font-weight:680;font-size:0.9rem;color:rgba(220,226,248,0.7);">CarSim</span>
      <span style="color:rgba(180,190,220,0.18);font-size:0.78rem;margin-left:6px;">&#169; 2025</span>
    </div>
    <div style="display:flex;gap:30px;flex-wrap:wrap;align-items:center;">
      <a href="#wp-features" class="footer-link">Features</a>
      <a href="#wp-showcase" class="footer-link">Showcase</a>
      <a href="#wp-metrics"  class="footer-link">Metrics</a>
    </div>
    <div style="font-size:0.72rem;color:rgba(170,180,210,0.18);">AI-powered autonomous driving research platform</div>
  </div>
</footer>
`;

export default function WelcomePage({ onStart }) {
  useEffect(() => {
    let cursorRaf, orbRaf, heroParticleRaf, simRaf;
    let heroResizeHandler, simResizeHandler;

    // Font
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,300;0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;0,14..32,900;1,14..32,300&display=swap';
    document.head.appendChild(fontLink);

    document.body.style.cursor = 'none';

    // Wire start buttons
    document.querySelectorAll('.start-sim-btn').forEach(btn => {
      btn.addEventListener('click', onStart);
    });

    // Loader
    const loaderTimer = setTimeout(() => {
      const el = document.getElementById('loader');
      if (el) el.classList.add('done');
    }, 2200);

    // Custom cursor
    const dot  = document.getElementById('cursor-dot');
    const ring = document.getElementById('cursor-ring');
    let mx = -100, my = -100, rx = -100, ry = -100;

    const onMouseMove = e => {
      mx = e.clientX; my = e.clientY;
      if (dot) { dot.style.left = mx + 'px'; dot.style.top = my + 'px'; }
    };
    document.addEventListener('mousemove', onMouseMove);

    const animRing = () => {
      rx += (mx - rx) * 0.14;
      ry += (my - ry) * 0.14;
      if (ring) { ring.style.left = rx + 'px'; ring.style.top = ry + 'px'; }
      cursorRaf = requestAnimationFrame(animRing);
    };
    cursorRaf = requestAnimationFrame(animRing);

    document.querySelectorAll('a, button, .feature-card, .metric-card, .badge-pill, .nav-link').forEach(el => {
      el.addEventListener('mouseenter', () => document.body.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => document.body.classList.remove('cursor-hover'));
    });

    const onMouseDown = () => {
      document.body.classList.add('cursor-click');
      setTimeout(() => document.body.classList.remove('cursor-click'), 200);
    };
    document.addEventListener('mousedown', onMouseDown);

    // Scroll progress
    const progressBar = document.getElementById('scroll-progress');
    const onScrollProgress = () => {
      if (!progressBar) return;
      const pct = window.scrollY / (document.body.scrollHeight - window.innerHeight) * 100;
      progressBar.style.width = pct + '%';
    };
    window.addEventListener('scroll', onScrollProgress, { passive: true });

    // Nav scroll compact
    const nav = document.getElementById('main-nav');
    const onNavScroll = () => { if (nav) nav.classList.toggle('scrolled', window.scrollY > 60); };
    window.addEventListener('scroll', onNavScroll, { passive: true });

    // Parallax orbs
    const hero = document.getElementById('wp-hero');
    const o1 = document.getElementById('orb1');
    const o2 = document.getElementById('orb2');
    let targetX = 0, targetY = 0, currX = 0, currY = 0;

    const onHeroMouse = e => {
      if (!hero) return;
      const r = hero.getBoundingClientRect();
      targetX = (e.clientX - r.left - r.width  / 2) / r.width;
      targetY = (e.clientY - r.top  - r.height / 2) / r.height;
    };
    if (hero) hero.addEventListener('mousemove', onHeroMouse);

    const animOrbs = () => {
      currX += (targetX - currX) * 0.05;
      currY += (targetY - currY) * 0.05;
      if (o1) o1.style.transform = `translate(${currX * 30}px, ${currY * 20}px)`;
      if (o2) o2.style.transform = `translate(${-currX * 22}px, ${-currY * 18}px)`;
      orbRaf = requestAnimationFrame(animOrbs);
    };
    orbRaf = requestAnimationFrame(animOrbs);

    // Button ripple
    document.querySelectorAll('.btn-primary').forEach(btn => {
      btn.addEventListener('click', function(e) {
        const r = this.getBoundingClientRect();
        const sz = Math.max(r.width, r.height);
        const rip = document.createElement('span');
        rip.className = 'ripple';
        Object.assign(rip.style, {
          width: sz + 'px', height: sz + 'px',
          left: (e.clientX - r.left - sz / 2) + 'px',
          top:  (e.clientY - r.top  - sz / 2) + 'px'
        });
        this.appendChild(rip);
        setTimeout(() => rip.remove(), 600);
      });
    });

    // 3-D card tilt
    document.querySelectorAll('.feature-card').forEach(card => {
      const MAX = 8;
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
        const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
        card.style.transform = `perspective(800px) rotateY(${dx*MAX}deg) rotateX(${-dy*MAX}deg) translateY(-8px) scale(1.015)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transition = 'transform 0.5s cubic-bezier(0.16,1,0.3,1), box-shadow 0.38s ease';
        card.style.transform = '';
        setTimeout(() => { card.style.transition = ''; }, 500);
      });
      card.addEventListener('mouseenter', () => {
        card.style.transition = 'transform 0.15s ease, box-shadow 0.38s ease';
      });
    });

    // Scroll reveal
    const revealObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
    }, { threshold: 0.1 });
    document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => revealObs.observe(el));

    // Divider draw
    const lineObs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('drawn'); });
    }, { threshold: 0.5 });
    document.querySelectorAll('.section-glow-line').forEach(el => lineObs.observe(el));

    // Stat bars
    const barObs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const fill = e.target.querySelector('.stat-fill');
          if (fill) fill.style.width = fill.dataset.width + '%';
        }
      });
    }, { threshold: 0.25 });
    document.querySelectorAll('.feature-card').forEach(el => barObs.observe(el));

    // Hero canvas particles
    const heroCanvas = document.getElementById('hero-canvas');
    if (heroCanvas) {
      const ctx = heroCanvas.getContext('2d');
      let W, H, particles = [];

      const heroResize = () => {
        W = heroCanvas.width  = heroCanvas.offsetWidth;
        H = heroCanvas.height = heroCanvas.offsetHeight;
      };
      heroResize();
      heroResizeHandler = () => { heroResize(); initP(); };
      window.addEventListener('resize', heroResizeHandler);

      class Particle {
        constructor() { this.reset(); }
        reset() {
          this.x = Math.random() * W; this.y = Math.random() * H;
          this.vx = (Math.random() - 0.5) * 0.22; this.vy = (Math.random() - 0.5) * 0.22;
          this.r = Math.random() * 1.2 + 0.4;
          this.opacity = Math.random() * 0.28 + 0.06;
          this.color = ['91,141,238','147,115,232','46,196,163'][Math.floor(Math.random() * 3)];
        }
        update() {
          this.x += this.vx; this.y += this.vy;
          if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
        }
        draw() {
          ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${this.color},${this.opacity})`; ctx.fill();
        }
      }

      const initP = () => { particles = Array.from({ length: 100 }, () => new Particle()); };
      initP();

      const drawConns = () => {
        for (let i = 0; i < particles.length; i++) {
          for (let j = i + 1; j < particles.length; j++) {
            const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
            const d = Math.sqrt(dx*dx + dy*dy);
            if (d < 95) {
              ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
              ctx.strokeStyle = `rgba(91,141,238,${0.055 * (1 - d/95)})`; ctx.lineWidth = 0.5; ctx.stroke();
            }
          }
        }
      };

      const pLoop = () => {
        ctx.clearRect(0, 0, W, H); drawConns();
        particles.forEach(p => { p.update(); p.draw(); });
        heroParticleRaf = requestAnimationFrame(pLoop);
      };
      heroParticleRaf = requestAnimationFrame(pLoop);
    }

    // Sim canvas
    const simCanvas = document.getElementById('sim-canvas');
    if (simCanvas) {
      const ctx = simCanvas.getContext('2d');
      let W, H, t = 0, score = 0, gen = 1, alive = 48, frame = 0;

      const simResize = () => {
        const r = simCanvas.parentElement.getBoundingClientRect();
        W = simCanvas.width  = r.width  || 800;
        H = simCanvas.height = r.height || (W * 9 / 16);
      };
      simResize();
      simResizeHandler = simResize;
      window.addEventListener('resize', simResizeHandler);

      // Preview cars matching real project — vertical road, north-bound
      let scrollY = 0;
      const aiCars = Array.from({ length: 4 }, (_, i) => ({
        lane: i % 3, color: ['#00ffff','#00e6ff','#33ffff','#66ffff'][i],
        yOff: i * 60, speed: 1.8
      }));
      const trafficCars = Array.from({ length: 5 }, (_, i) => ({
        lane: Math.floor(Math.random()*3), color: ['#ff00ff','#ff0080','#8000ff'][i%3],
        yOff: 200 + i * 180, speed: 1.0
      }));

      const drawRoad = () => {
        // Dark cyber background
        ctx.fillStyle = '#050810'; ctx.fillRect(0,0,W,H);
        const roadW = W * 0.38;
        const cx = W * 0.55;
        const laneW = roadW / 3;
        // Road body
        ctx.fillStyle = 'rgba(30,30,40,0.95)';
        ctx.fillRect(cx - roadW/2, 0, roadW, H);
        // Lane dashes (animated scroll)
        ctx.strokeStyle = 'rgba(0,255,255,0.3)';
        ctx.lineWidth = 2;
        ctx.setLineDash([18, 18]);
        for (let lane = 1; lane < 3; lane++) {
          const lx = cx - roadW/2 + lane * laneW;
          ctx.lineDashOffset = -scrollY;
          ctx.beginPath();
          ctx.moveTo(lx, 0); ctx.lineTo(lx, H); ctx.stroke();
        }
        ctx.setLineDash([]); ctx.lineDashOffset = 0;
        // Cyan glowing borders
        ctx.strokeStyle = '#00ffff'; ctx.lineWidth = 4;
        ctx.shadowBlur = 18; ctx.shadowColor = '#00ffff';
        ctx.beginPath(); ctx.moveTo(cx - roadW/2, 0); ctx.lineTo(cx - roadW/2, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(cx + roadW/2, 0); ctx.lineTo(cx + roadW/2, H); ctx.stroke();
        ctx.shadowBlur = 0;
        return { cx, roadW, laneW };
      };

      const carPos = (c, info) => {
        const x = info.cx - info.roadW/2 + (c.lane + 0.5) * info.laneW;
        // Scroll-based loop: cars move north (top of canvas)
        const y = ((H + 100) - ((scrollY * c.speed + c.yOff) % (H + 200))) - 50;
        return { x, y };
      };

      const drawCar = (c, info, isAI) => {
        const { x, y } = carPos(c, info);
        ctx.save();
        ctx.translate(x, y);
        // Body
        ctx.fillStyle = c.color;
        ctx.shadowBlur = isAI ? 16 : 8;
        ctx.shadowColor = c.color;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(-9, -16, 18, 32, 4);
        else ctx.rect(-9, -16, 18, 32);
        ctx.fill();
        ctx.shadowBlur = 0;
        // Windshield
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-7, -12, 14, 6);
        ctx.restore();
        // Sensor rays for AI cars
        if (isAI) {
          const angles = [0, Math.PI/4, -Math.PI/4, Math.PI/2, -Math.PI/2];
          for (const a of angles) {
            const ex = x + Math.sin(a) * 50;
            const ey = y - Math.cos(a) * 50;
            ctx.beginPath();
            ctx.moveTo(x, y); ctx.lineTo(ex, ey);
            ctx.strokeStyle = 'rgba(0,255,255,0.25)';
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      };

      const updateCars = () => {
        scrollY += 1.4;
      };

      // Neural network overlay matching real project (8 → 8 → 3)
      const drawNet = () => {
        const sX = W * 0.04, sY = H * 0.12;
        const layers = [8, 8, 3];
        const labels = ['Inputs','Hidden','Outputs'];
        const lW = 50, lH = 18;
        const nodes = [];
        layers.forEach((n, li) => {
          nodes.push([]);
          const ySpacing = lH;
          for (let ni = 0; ni < n; ni++) {
            const x = sX + li * lW;
            const y = sY + (ni - (n-1)/2) * ySpacing;
            nodes[li].push({ x, y });
          }
        });
        // Connections
        for (let li = 0; li < nodes.length - 1; li++) {
          nodes[li].forEach((a, ai) => nodes[li+1].forEach((b, bi) => {
            const w = Math.sin(t * 0.03 + ai + bi);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
            ctx.strokeStyle = w > 0
              ? `rgba(0,255,255,${0.08 + Math.abs(w) * 0.18})`
              : `rgba(255,0,128,${0.08 + Math.abs(w) * 0.18})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }));
        }
        // Nodes
        layers.forEach((n, li) => {
          for (let ni = 0; ni < n; ni++) {
            const { x, y } = nodes[li][ni];
            const act = (Math.sin(t * 0.05 + li * 2 + ni) * 0.5 + 0.5);
            ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0,255,255,${0.3 + act * 0.6})`;
            ctx.shadowBlur = 6; ctx.shadowColor = '#00ffff';
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        });
        // Layer labels
        ctx.fillStyle = 'rgba(0,255,255,0.7)';
        ctx.font = '8px monospace';
        ctx.textAlign = 'center';
        layers.forEach((_, li) => {
          ctx.fillText(labels[li], sX + li * lW, sY - (lH * 4.5));
        });
      };

      const sLoop = () => {
        t++; frame++; simResize();
        const info = drawRoad();
        updateCars();
        // Draw traffic (purple) first, then AI cars (cyan) on top
        trafficCars.forEach(c => drawCar(c, info, false));
        aiCars.forEach(c => drawCar(c, info, true));
        drawNet();
        if (frame%8===0) {
          score = Math.min(9999, score+Math.floor(Math.random()*15+5));
          const s=document.getElementById('hud-score'), sp=document.getElementById('hud-speed');
          if (s) s.textContent=score.toLocaleString();
          if (sp) sp.textContent=Math.floor(65+Math.random()*20)+' km/h';
        }
        if (frame%300===0) {
          gen++; alive=Math.max(10,50-Math.floor(Math.random()*8));
          const g=document.getElementById('hud-gen'), a=document.getElementById('hud-alive');
          if (g) g.textContent=String(gen).padStart(3,'0');
          if (a) a.textContent=alive+' / 50';
          score=0;
        }
        simRaf = requestAnimationFrame(sLoop);
      };
      simRaf = requestAnimationFrame(sLoop);
    }

    return () => {
      document.body.style.cursor = '';
      document.body.classList.remove('cursor-hover', 'cursor-click');
      try { document.head.removeChild(fontLink); } catch(_) {}
      clearTimeout(loaderTimer);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('scroll', onScrollProgress);
      window.removeEventListener('scroll', onNavScroll);
      if (hero) hero.removeEventListener('mousemove', onHeroMouse);
      if (heroResizeHandler) window.removeEventListener('resize', heroResizeHandler);
      if (simResizeHandler)  window.removeEventListener('resize', simResizeHandler);
      cancelAnimationFrame(cursorRaf);
      cancelAnimationFrame(orbRaf);
      cancelAnimationFrame(heroParticleRaf);
      cancelAnimationFrame(simRaf);
      revealObs.disconnect();
      lineObs.disconnect();
      barObs.disconnect();
    };
  }, [onStart]);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div
        id="wp-root"
        style={{
          fontFamily: "'Inter', system-ui, sans-serif",
          fontFeatureSettings: '"ss01","cv01","cv02"',
          background: '#04060f',
          color: '#eceef6',
          overflowX: 'hidden',
          WebkitFontSmoothing: 'antialiased',
          minHeight: '100vh'
        }}
        dangerouslySetInnerHTML={{ __html: HTML }}
      />
    </>
  );
}
