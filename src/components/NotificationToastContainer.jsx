import React, { useEffect, useRef } from "react";
import { ShoppingBag, Smartphone, Bell, X } from "lucide-react";
import "bootstrap/dist/css/bootstrap.min.css";

// Dynamic synthesized double-tone audio chime (D5 followed by A5)
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    // Play D5 (587.33Hz) first, then transition to A5 (880Hz)
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch (error) {
    console.warn("Audio Context playback failed or was blocked by browser autoplay policy:", error);
  }
};

const NotificationToastContainer = ({ toasts, onDismiss, onNavigate }) => {
  const previousLengthRef = useRef(toasts.length);

  // Play audio chime when a new toast is added
  useEffect(() => {
    if (toasts.length > previousLengthRef.current) {
      playChime();
    }
    previousLengthRef.current = toasts.length;
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: "20px",
        right: "20px",
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "380px",
        width: "100%",
        pointerEvents: "none", // Allows clicks to fall through unless hovering a toast
      }}
    >
      {toasts.map((toast) => {
        // Icon and styling selection based on type
        const isOrder = toast.type === "order";
        const themeColor = isOrder ? "#6366f1" : "#10b981"; // Indigo for orders, emerald for recharges
        const Icon = isOrder ? ShoppingBag : Smartphone;

        return (
          <div
            key={toast.id}
            className="shadow-lg rounded-4 p-3 toast-item"
            style={{
              pointerEvents: "auto", // Re-enable pointer events for interactions
              background: "rgba(255, 255, 255, 0.88)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              borderLeft: `5px solid ${themeColor}`,
              borderTop: "1px solid rgba(255, 255, 255, 0.5)",
              borderRight: "1px solid rgba(0, 0, 0, 0.05)",
              borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
              color: "#1f2937",
              animation: "slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
              position: "relative",
            }}
          >
            {/* Slide-in Keyframe Animation Style injected locally */}
            <style>{`
              @keyframes slideIn {
                from {
                  transform: translateX(120%) scale(0.9);
                  opacity: 0;
                }
                to {
                  transform: translateX(0) scale(1);
                  opacity: 1;
                }
              }
            `}</style>

            <div className="d-flex align-items-start gap-3">
              <div
                className="rounded-3 p-2 d-flex align-items-center justify-content-center text-white"
                style={{
                  background: `linear-gradient(135deg, ${themeColor}dd, ${themeColor})`,
                  boxShadow: `0 4px 10px rgba(0,0,0,0.1)`,
                }}
              >
                <Icon size={20} />
              </div>
              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center justify-content-between mb-1">
                  <span className="fw-bold small text-uppercase tracking-wider" style={{ color: themeColor }}>
                    {isOrder ? "New Order" : "New Recharge"}
                  </span>
                  <span className="text-muted small" style={{ fontSize: "11px" }}>
                    Just now
                  </span>
                </div>
                <h6 className="fw-semibold mb-1" style={{ fontSize: "14px" }}>
                  {toast.title}
                </h6>
                <p className="text-muted mb-2 text-truncate-2" style={{ fontSize: "12px", lineHeight: "1.4" }}>
                  {toast.body}
                </p>

                <div className="d-flex gap-2">
                  <button
                    className="btn btn-sm text-white px-3 rounded-pill fw-semibold border-0"
                    style={{
                      background: `linear-gradient(135deg, ${themeColor} 0%, ${themeColor}cc 100%)`,
                      fontSize: "11px",
                      boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                    }}
                    onClick={() => {
                      onNavigate(isOrder ? "Orders" : "Recharge Request");
                      onDismiss(toast.id);
                    }}
                  >
                    {isOrder ? "View Order" : "View Recharge"}
                  </button>
                  <button
                    className="btn btn-sm btn-light border px-3 rounded-pill text-mutedfw-semibold"
                    style={{ fontSize: "11px" }}
                    onClick={() => onDismiss(toast.id)}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
              <button
                className="btn btn-link p-0 text-muted border-0 align-self-start"
                style={{ opacity: 0.6 }}
                onClick={() => onDismiss(toast.id)}
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default NotificationToastContainer;
