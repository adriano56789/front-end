import React from 'react';

export const USAFlagIcon: React.FC<React.SVGProps<SVGSVGElement> | React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <img src="https://flagcdn.com/us.svg" alt="Estados Unidos" className="w-[1em] h-[1em] object-cover" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
);
