import './GlitchText.css';
import { ReactNode } from 'react';

interface GlitchTextProps {
    children: ReactNode;
    speed?: number;
    enableShadows?: boolean;
    enableOnHover?: boolean;
    isActive?: boolean;
    className?: string;
}

const GlitchText = ({
    children,
    speed = 1,
    enableShadows = true,
    enableOnHover = true,
    isActive = false,
    className = ''
}: GlitchTextProps) => {
    const glitchStyles = {
        '--after-duration': `${speed * 3}s`,
        '--before-duration': `${speed * 2}s`,
        '--after-shadow': enableShadows ? '-5px 0 red' : 'none',
        '--before-shadow': enableShadows ? '5px 0 cyan' : 'none'
    } as React.CSSProperties;

    const hoverClass = enableOnHover ? 'enable-on-hover' : '';
    const activeClass = isActive ? 'active' : '';

    // Cast children to string for data-text if simple text, otherwise careful
    const dataText = typeof children === 'string' ? children : '';

    return (
        <div
            className={`glitch ${hoverClass} ${activeClass} ${className}`}
            style={glitchStyles}
            data-text={dataText}
        >
            {children}
        </div>
    );
};

export default GlitchText;
