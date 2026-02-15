import { motion, HTMLMotionProps, Variants } from 'framer-motion'
import { Box, BoxProps } from '@chakra-ui/react'

// Combine Chakra BoxProps and Framer Motion props
type Merge<P, T> = Omit<P, keyof T> & T;
type MotionBoxProps = Merge<BoxProps, HTMLMotionProps<"div">>;

export const MotionBox = motion(Box) as React.FC<MotionBoxProps>;

export const fadeInUp: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
}

export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: 0.2
        }
    }
}
