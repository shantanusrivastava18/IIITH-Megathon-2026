import { useEffect, useRef, useState } from "react";
import { animate, useInView } from "framer-motion";

export const CountUp = ({ value, decimals = 0, format, duration = 1.4 }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, Number(value) || 0, { duration, ease: [0.16, 1, 0.3, 1], onUpdate: setN });
    return () => c.stop();
  }, [inView, value, duration]);
  const shown = format ? format(n) : n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return <span ref={ref}>{shown}</span>;
};
