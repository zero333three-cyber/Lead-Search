import { motion } from 'framer-motion';
import { IconType } from 'react-icons';

interface AnimatedIconProps {
  icon: IconType;
  size?: number;
}

const AnimatedIcon: React.FC<AnimatedIconProps> = ({ icon: Icon, size = 24 }) => {
  return (
    <motion.div
      whileHover={{ rotate: 360, scale: 1.2 }}
      transition={{ type: 'spring', stiffness: 300 }}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <Icon size={size} />
    </motion.div>
  );
};

export default AnimatedIcon;
