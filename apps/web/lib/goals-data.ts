export type GoalStatus = "on-track" | "behind"

export type Goal = {
  id: string
  name: string
  target: number
  current: number
  deadline: string | null
  status: GoalStatus
  nextAction: string
  imageUrl?: string
}

export const mockGoals: Goal[] = [
  {
    id: "vacation",
    name: "Japan trip",
    target: 6_000,
    current: 1_200,
    deadline: "Dec 2026",
    status: "behind",
    nextAction: "Increase monthly contribution by MYR 300.",
    imageUrl: "/banners/banner_1.jpg",
  },
  {
    id: "emergency",
    name: "Emergency fund",
    target: 15_000,
    current: 8_500,
    deadline: null,
    status: "on-track",
    nextAction: "Add MYR 500 to reach 60% milestone.",
    imageUrl: "/banners/banner_2.jpg",
  },
  {
    id: "home",
    name: "Down Payment",
    target: 50_000,
    current: 15_000,
    deadline: "Jun 2028",
    status: "on-track",
    nextAction: "Keep up the good work!",
    imageUrl: "/banners/banner_3.jpg",
  },
  {
    id: "car",
    name: "New Car",
    target: 80_000,
    current: 5_000,
    deadline: "Jan 2029",
    status: "behind",
    nextAction: "Consider increasing savings rate.",
    imageUrl: "/banners/banner_4.jpg",
  },
]

export function formatMYR(value: number) {
  return `MYR ${value.toLocaleString("en-MY")}`
}
