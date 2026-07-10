import React, { InputHTMLAttributes, useState } from 'react';
import { cn } from "@/lib/utils";

interface NeonCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

const NeonCheckbox: React.FC<NeonCheckboxProps> = ({ 
  label, 
  className = '',
  checked: controlledChecked,
  defaultChecked,
  onChange,
  ...props 
}) => {
  // Use internal state for uncontrolled component
  const [internalChecked, setInternalChecked] = useState(defaultChecked || false);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = controlledChecked !== undefined;
  const isChecked = isControlled ? controlledChecked : internalChecked;
  
  // Handle changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isControlled) {
      setInternalChecked(e.target.checked);
    }
    onChange?.(e);
  };

  // Define CSS variables with React using inline styles
  const neonCheckboxStyles = {
    '--primary': '#00cec4',
    '--primary-dark': 'rgba(0, 206, 196, 0.4)',
    '--primary-light': '#00ffaa',
    '--checkbox-surface': 'var(--color-surface)',
    '--size': '20px',
  } as React.CSSProperties;

  return (
    <label 
      className={cn("relative inline-flex items-center cursor-pointer select-none", className)}
      style={neonCheckboxStyles}
    >
      <div className="relative w-[var(--size)] h-[var(--size)] flex-shrink-0">
        <input 
          type="checkbox" 
          className="hidden" 
          checked={isChecked}
          onChange={handleChange}
          {...props} 
        />
        
        <div className="relative w-full h-full neon-checkbox__frame">
          <div className={cn(
            "absolute inset-0 rounded border bg-[var(--checkbox-surface)] transition-all duration-300 neon-checkbox__box",
            isChecked 
              ? 'border-[var(--primary)] bg-[rgba(0,206,196,0.12)] shadow-[0_0_0_3px_rgba(0,206,196,0.10)]' 
              : 'border-[var(--primary-dark)]'
          )}>
            <div className="absolute inset-[1px] flex items-center justify-center neon-checkbox__check-container">
              <svg 
                viewBox="0 0 24 24" 
                className={cn(
                  "w-[90%] h-[90%] fill-none stroke-[var(--primary)] stroke-[3] stroke-linecap-round stroke-linejoin-round [stroke-dasharray:40] origin-center transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] neon-checkbox__check",
                  isChecked 
                    ? '[stroke-dashoffset:0] scale-100' 
                    : '[stroke-dashoffset:40]'
                )}
              >
                <path d="M3,12.5l7,7L21,5"></path>
              </svg>
            </div>
            
            <div className={cn(
              "absolute -inset-0.5 rounded bg-[var(--primary)] blur-sm transition-opacity duration-300 neon-checkbox__glow",
              isChecked ? 'opacity-30' : 'opacity-0'
            )} />
            
            <div className="absolute inset-0 rounded overflow-hidden neon-checkbox__borders">
              {[...Array(4)].map((_, i) => (
                <span 
                  key={i} 
                  className={cn(
                    "absolute w-5 h-px bg-[var(--primary)] transition-opacity duration-300",
                    isChecked ? 'opacity-100' : 'opacity-0',
                    i === 0 ? 'top-0 left-[-100%] animate-[borderFlow1_1.5s_linear_infinite]' : 
                    i === 1 ? 'top-[-100%] right-0 w-px h-5 animate-[borderFlow2_1.5s_linear_infinite]' : 
                    i === 2 ? 'bottom-0 right-[-100%] animate-[borderFlow3_1.5s_linear_infinite]' : 
                    'bottom-[-100%] left-0 w-px h-5 animate-[borderFlow4_1.5s_linear_infinite]'
                  )}
                />
              ))}
            </div>
          </div>
          
          <div className="neon-checkbox__effects">
            <div className="absolute inset-0 neon-checkbox__particles">
              {[...Array(12)].map((_, i) => (
                <span 
                  key={i} 
                  className={cn(
                    "absolute w-0.5 h-0.5 bg-[var(--primary)] rounded-full pointer-events-none top-1/2 left-1/2 shadow-[0_0_4px_var(--primary)]",
                    isChecked ? 'animate-[particleExplosion_0.5s_ease-out_forwards]' : 'opacity-0'
                  )}
                  style={{ 
                    '--x': [
                      '15px', '-15px', '15px', '-15px', '22px', 
                      '-22px', '0px', '0px', '12px', '-12px', 
                      '18px', '-18px'
                    ][i],
                    '--y': [
                      '-15px', '-15px', '15px', '15px', '0px', 
                      '0px', '22px', '-22px', '-18px', '18px', 
                      '12px', '-12px'
                    ][i],
                  } as React.CSSProperties}
                />
              ))}
            </div>
            
            <div className="absolute -inset-3 pointer-events-none neon-checkbox__rings">
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "absolute inset-0 rounded-full border border-[var(--primary)] scale-0 ring",
                    isChecked ? 'animate-[ringPulse_0.5s_ease-out_forwards]' : 'opacity-0'
                  )}
                  style={{ animationDelay: `${i * 0.08}s` } as React.CSSProperties}
                />
              ))}
            </div>
            
            <div className="absolute inset-0 neon-checkbox__sparks">
              {[...Array(4)].map((_, i) => (
                <span 
                  key={i} 
                  className={cn(
                    "absolute w-3 h-px bg-gradient-to-r from-[var(--primary)] to-transparent top-1/2 left-1/2",
                    isChecked ? 'animate-[sparkFlash_0.5s_ease-out_forwards]' : 'opacity-0'
                  )}
                  style={{ '--r': `${i * 90}deg` } as React.CSSProperties}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      
      {label && (
        <span className="ml-3 text-sm leading-5 text-on-surface select-none font-medium">{label}</span>
      )}
    </label>
  );
};

export { NeonCheckbox };
