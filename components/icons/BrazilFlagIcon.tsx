import React from 'react';

export const BrazilFlagIcon: React.FC<React.SVGProps<SVGSVGElement> | React.ImgHTMLAttributes<HTMLImageElement>> = (props) => (
    <img src="https://flagcdn.com/br.svg" alt="Brasil" className="w-[1em] h-[1em] object-cover" {...(props as React.ImgHTMLAttributes<HTMLImageElement>)} />
);
