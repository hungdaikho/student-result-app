"use client"

import { useEffect, useState } from "react"

interface CelebrationAnimationProps {
  show: boolean
  onComplete: () => void
}

export function CelebrationAnimation({ show, onComplete }: CelebrationAnimationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Auto-hide after 5 seconds (longer duration)
      const timer = setTimeout(() => {
        setIsVisible(false)
        onComplete()
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [show, onComplete])

  useEffect(() => {
    if (isVisible) {
      // Create confetti
      const createConfetti = () => {
        for (let i = 0; i < 50; i++) {
          const confetti = document.createElement("div")
          confetti.className = "celebration-confetti"
          confetti.style.left = Math.random() * 100 + "vw"
          confetti.style.animationDelay = Math.random() * 3 + "s"
          confetti.style.animationDuration = Math.random() * 3 + 2 + "s"

          // Random colors
          const colors = ["#ff6b6b", "#4ecdc4", "#feca57", "#ff9ff3"]
          confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]

          if (Math.random() > 0.5) {
            confetti.style.borderRadius = "50%"
          }

          document.body.appendChild(confetti)

          // Remove confetti after animation
          setTimeout(() => {
            if (confetti.parentNode) {
              confetti.remove()
            }
          }, 8000)
        }
      }

      // Create flower rain
      const createFlowerRain = () => {
        const flowers = ["🌸", "🌺", "🌻", "🌼", "🌷", "🌹", "🏵️", "💐"]

        for (let i = 0; i < 15; i++) {
          const flower = document.createElement("div")
          flower.className = "celebration-flower"
          flower.innerHTML = flowers[Math.floor(Math.random() * flowers.length)]
          flower.style.left = Math.random() * 100 + "vw"
          flower.style.animationDelay = Math.random() * 4 + "s"
          flower.style.animationDuration = Math.random() * 3 + 3 + "s"
          document.body.appendChild(flower)

          // Remove flower after animation
          setTimeout(() => {
            if (flower.parentNode) {
              flower.remove()
            }
          }, 10000)
        }
      }

      // Create sparkles
      const createSparkles = () => {
        const sparkles = ["✨", "🌟", "⭐", "💫"]
        for (let i = 0; i < 20; i++) {
          const sparkle = document.createElement("div")
          sparkle.innerHTML = sparkles[Math.floor(Math.random() * sparkles.length)]
          sparkle.className = "celebration-sparkle"
          sparkle.style.left = Math.random() * 100 + "vw"
          sparkle.style.top = Math.random() * 100 + "vh"
          document.body.appendChild(sparkle)

          setTimeout(() => {
            if (sparkle.parentNode) {
              sparkle.remove()
            }
          }, 3000)
        }
      }

      // Start animations immediately
      createConfetti()
      createFlowerRain()
      createSparkles()

      // Create continuous effects every 1.5 seconds
      const confettiInterval = setInterval(() => {
        createConfetti()
      }, 1500)

      const flowerInterval = setInterval(() => {
        createFlowerRain()
      }, 2000)

      const sparkleInterval = setInterval(() => {
        createSparkles()
      }, 2500)

      return () => {
        clearInterval(confettiInterval)
        clearInterval(flowerInterval)
        clearInterval(sparkleInterval)
        // Clean up any remaining elements
        document.querySelectorAll(".celebration-confetti, .celebration-flower, .celebration-sparkle").forEach((el) => {
          if (el.parentNode) {
            el.remove()
          }
        })
      }
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <>
      <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
        <div className="celebration-container absolute inset-0 flex items-center justify-center">
          {/* Empty container - all effects are created dynamically */}
        </div>
      </div>

      <style jsx global>{`
        .celebration-confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          background: #ff6b6b;
          animation: celebration-confetti-fall linear infinite;
          pointer-events: none;
          z-index: 9999;
        }

        .celebration-flower {
          position: absolute;
          font-size: 2rem;
          animation: celebration-flower-fall linear infinite;
          pointer-events: none;
          z-index: 9999;
        }

        .celebration-sparkle {
          position: absolute;
          font-size: 2rem;
          pointer-events: none;
          animation: celebration-fadeInUp 2s ease-out forwards;
          z-index: 9999;
        }

        @keyframes celebration-confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        @keyframes celebration-flower-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          50% {
            transform: translateY(50vh) rotate(180deg);
            opacity: 0.8;
          }
          100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
          }
        }

        @keyframes celebration-fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes celebration-bounceIn {
          0% {
            transform: scale(0.3);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes celebration-rotate {
          0%, 100% {
            transform: rotate(0deg);
          }
          25% {
            transform: rotate(-10deg);
          }
          75% {
            transform: rotate(10deg);
          }
        }

        @keyframes celebration-float {
          0%, 100% {
            transform: translateY(0px);
            opacity: 0.7;
          }
          50% {
            transform: translateY(-20px);
            opacity: 1;
          }
        }

        @keyframes celebration-pulse {
          0% {
            transform: scale(1);
            opacity: 0.8;
          }
          50% {
            transform: scale(1.1);
            opacity: 0.6;
          }
          100% {
            transform: scale(1);
            opacity: 0.8;
          }
        }
      `}</style>
    </>
  )
}
