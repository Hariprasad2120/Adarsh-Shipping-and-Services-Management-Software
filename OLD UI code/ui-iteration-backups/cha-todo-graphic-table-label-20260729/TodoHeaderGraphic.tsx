import { motion } from "framer-motion";

export function TodoHeaderGraphic() {
  return (
    <div className="relative w-[280px] h-[110px] flex items-center justify-end select-none pointer-events-none overflow-visible">
      {/* Background Soft Gold Radial Glow */}
      <div className="absolute inset-0 bg-radial from-[#faeccb]/40 via-transparent to-transparent blur-xl" />

      {/* Base Stacked Card (Lower, offset, higher transparency) */}
      <motion.div
        className="absolute w-[190px] h-[70px] rounded-[20px] bg-[#fbf6e8]/40 border border-[#e6d9b8]/50 shadow-xs flex items-center p-3 gap-3"
        style={{ top: "35px", right: "10px", transformOrigin: "center center" }}
        animate={{
          y: [0, 4, 0],
          rotate: [3, 5, 3],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Minimal Checkmark */}
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[#a88a44] opacity-60">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        {/* Skeleton Lines */}
        <div className="flex-1 space-y-2 opacity-40">
          <div className="h-1.5 w-24 bg-[#8c7336] rounded-full" />
          <div className="h-1.5 w-16 bg-[#8c7336] rounded-full" />
        </div>
      </motion.div>

      {/* Top Primary Card (Clean, subtle semi-transparent glass) */}
      <motion.div
        className="absolute w-[205px] h-[76px] rounded-[22px] bg-white/55 backdrop-blur-xs border border-white/80 p-3.5 shadow-sm flex items-center gap-3.5"
        style={{ top: "8px", right: "25px", transformOrigin: "center center" }}
        animate={{
          y: [0, -4, 0],
          rotate: [-2, 0, -2],
        }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* Minimal Gold Checkmark Icon */}
        <div className="w-8 h-8 rounded-xl bg-[#f7ebd0]/60 border border-[#e5d4a7]/60 flex items-center justify-center text-[#9e7f3b] shrink-0">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        {/* Minimal Skeleton Lines */}
        <div className="flex-1 space-y-2.5">
          <div className="h-1.5 w-28 bg-[#8c7336]/35 rounded-full" />
          <div className="h-1.5 w-20 bg-[#8c7336]/20 rounded-full" />
        </div>

        {/* Small Gold Accent Dot */}
        <div className="w-2 h-2 rounded-full bg-[#dca838]/80 shrink-0 self-start mt-1" />
      </motion.div>
    </div>
  );
}

export default TodoHeaderGraphic;
