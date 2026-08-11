import React from 'react';

export const PortugalFlagIcon: React.FC<React.SVGProps<SVGSVGElement> | React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <img src="https://flagcdn.com/pt.svg" alt="Portugal" className="w-[1em] h-[1em] object-cover" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
);
