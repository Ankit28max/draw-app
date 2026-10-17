import React, { type JSX } from "react";

export interface CardProps {
  className?: string;
  title?: string;
  children: React.ReactNode;
  href?: string;
}

export function Card({
  className,
  title,
  children,
  href,
}: CardProps): JSX.Element {
  if (href) {
    return (
      <a
        className={className}
        href={`${href}?utm_source=create-turbo&utm_medium=basic&utm_campaign=create-turbo`}
        rel="noopener noreferrer"
        target="_blank"
      >
        {title && (
          <h2>
            {title} <span>-&gt;</span>
          </h2>
        )}
        {children}
      </a>
    );
  }

  return (
    <div className={className}>
      {title && (
        <h2>
          {title} <span>-&gt;</span>
        </h2>
      )}
      {children}
    </div>
  );
}
