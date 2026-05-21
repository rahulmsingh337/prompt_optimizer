import { useEffect, useRef } from "react";

export default function PlexusBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Dynamic scale depending on window/screen size
    const isMobile = width < 768;
    const numNodes = isMobile ? 50 : 100;
    const connectDistance = isMobile ? 100 : 150;

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      pulseSpeed: number;
      pulseTimer: number;
    }

    const nodes: Node[] = [];

    // Initialize nodes
    for (let i = 0; i < numNodes; i++) {
      nodes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        // Slow atmospheric velocity
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 2.5 + 1.2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
        pulseTimer: Math.random() * Math.PI,
      });
    }

    // Capture mouse positions
    const mouse = { x: -1000, y: -1000, radius: 180 };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    const handleMouseLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
    };

    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Track resizing properly using a ResizeObserver to prevent canvas stretching or distortion
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    
    // Observe body for resize
    resizeObserver.observe(document.body);

    // Animation frame loop
    const animate = () => {
      // Clear with very slight transparency to leave a subtle visual trail
      ctx.fillStyle = "rgba(11, 15, 25, 0.85)";
      ctx.fillRect(0, 0, width, height);

      // Draw faint square background grid lines matching the uploaded blueprint style
      ctx.strokeStyle = "rgba(99, 102, 241, 0.05)";
      ctx.lineWidth = 1;
      const gridSize = 80;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw subtle coordinates crosshairs / reference ticks matching the upload file structure
      ctx.fillStyle = "rgba(99, 102, 241, 0.25)";
      const ticks = [
        { x: width * 0.3, y: height * 0.2 },
        { x: width * 0.7, y: height * 0.4 },
        { x: width * 0.4, y: height * 0.8 },
        { x: width * 0.85, y: height * 0.75 }
      ];
      ticks.forEach((tick) => {
        ctx.fillRect(tick.x - 4, tick.y, 9, 1);
        ctx.fillRect(tick.x, tick.y - 4, 1, 9);
      });

      // Update and Draw nodes
      nodes.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off canvas margins smoothly to retain active nodes count
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;

        // Keep node positions bounded
        if (node.x < 0) node.x = 0;
        if (node.x > width) node.x = width;
        if (node.y < 0) node.y = 0;
        if (node.y > height) node.y = height;

        // Dynamic mouse interactivity: gently attract nodes that are close to user cursor
        if (mouse.x > -1000) {
          const dx = mouse.x - node.x;
          const dy = mouse.y - node.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            // Attract slightly
            node.x += (dx / dist) * force * 0.6;
            node.y += (dy / dist) * force * 0.6;
          }
        }

        // Draw pulsing soft glow
        node.pulseTimer += node.pulseSpeed;
        const currentRadius = node.radius + Math.sin(node.pulseTimer) * 0.6;

        // Radial glowing node point matching exact visual reference upload colors (deep indigo to sky-blue)
        const gradient = ctx.createRadialGradient(
          node.x,
          node.y,
          0,
          node.x,
          node.y,
          currentRadius * 3.5
        );
        gradient.addColorStop(0, "rgba(56, 189, 248, 0.95)"); // celestial sky blue
        gradient.addColorStop(0.4, "rgba(99, 102, 241, 0.45)"); // indigo
        gradient.addColorStop(1, "rgba(99, 102, 241, 0)");

        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 3.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw node core center
        ctx.beginPath();
        ctx.arc(node.x, node.y, currentRadius * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
        ctx.fill();
      });

      // Draw connecting lines with alpha based on distance
      for (let i = 0; i < nodes.length; i++) {
        const n1 = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const n2 = nodes[j];
          const dx = n1.x - n2.x;
          const dy = n1.y - n2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectDistance) {
            const alpha = (1 - dist / connectDistance) * 0.22;
            ctx.strokeStyle = `rgba(99, 102, 241, ${alpha})`;
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(n2.x, n2.y);
            ctx.stroke();
          }
        }

        // Draw special dynamic connection to mouse cursor if within interactive radius
        if (mouse.x > -1000) {
          const dx = mouse.x - n1.x;
          const dy = mouse.y - n1.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const alpha = (1 - dist / mouse.radius) * 0.28;
            ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`; // Sky blue accent line
            ctx.lineWidth = 1.1;
            ctx.beginPath();
            ctx.moveTo(n1.x, n1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 pointer-events-none select-none bg-transparent"
    />
  );
}
