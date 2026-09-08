import React from "react";
import styles from "./StarButton.module.css";

const STAR_CLASSES = [
  styles.star1,
  styles.star2,
  styles.star3,
  styles.star4,
  styles.star5,
  styles.star6,
];

const Star = ({ className }: { className: string }) => (
  <svg
    className={`${styles.star} ${className}`}
    viewBox="0 0 784.11 815.53"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <path
      className={styles.starFill}
      d="M392.05 0c-20.9 210.08-184.06 378.41-392.05 407.78 207.96 29.37 371.12 197.68 392.05 407.74 20.93-210.06 184.09-378.37 392.05-407.74-207.96-29.37-371.15-197.7-392.05-407.78z"
    />
  </svg>
);

const StarButton = ({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
  <button className={`${styles.starButton} ${className}`.trim()} {...props}>
    <span className={styles.label}>{children}</span>
    {STAR_CLASSES.map((cls, i) => (
      <Star key={i} className={cls} />
    ))}
  </button>
);

export default StarButton;
