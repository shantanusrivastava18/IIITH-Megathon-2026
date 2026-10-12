import { motion } from "framer-motion";

export const EASE = [0.16, 1, 0.3, 1];

export const MaskedLines = ({ lines, className = "", lineClassName = "", delay = 0, as = "span" }) => {
  const Tag = motion[as] || motion.span;
  return (
    <span className={`block ${className}`}>
      {lines.map((l, i) => (
        <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
          <Tag
            className={`block will-change-transform ${lineClassName}`}
            initial={{ y: "115%" }}
            animate={{ y: 0 }}
            transition={{ duration: 1, delay: delay + i * 0.13, ease: EASE }}
          >
            {l}
          </Tag>
        </span>
      ))}
    </span>
  );
};

export const Reveal = ({ children, delay = 0, y = 24, className = "", once = true }) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once, margin: "-60px" }}
    transition={{ duration: 0.8, delay, ease: EASE }}
  >
    {children}
  </motion.div>
);

export const Stagger = ({ children, className = "", gap = 0.08 }) => (
  <motion.div
    className={className}
    initial="hidden"
    whileInView="show"
    viewport={{ once: true, margin: "-60px" }}
    variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}
  >
    {children}
  </motion.div>
);

export const StaggerItem = ({ children, className = "" }) => (
  <motion.div
    className={className}
    variants={{
      hidden: { opacity: 0, y: 22 },
      show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } },
    }}
  >
    {children}
  </motion.div>
);
