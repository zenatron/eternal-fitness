'use client'

import { useState, useEffect } from 'react'
import { DashboardHeader } from './dashboard/DashboardHeader'
import { StreakCard } from './dashboard/StreakCard'
import { ProgressCard } from './dashboard/ProgressCard'
import { RecentActivityCard } from './dashboard/RecentActivityCard'
import { UpcomingWorkoutsCard } from './dashboard/UpcomingWorkoutsCard'
import { StatsCard } from './dashboard/StatsCard'
import { QuickActionsCard } from './dashboard/QuickActionsCard'
import { DashboardSkeleton } from './dashboard/DashboardSkeleton'
import { useDashboardData } from '@/lib/hooks/useDashboardData'

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const { data, loading, error, refetch } = useDashboardData()
  
  // Fix hydration issues
  useEffect(() => {
    setMounted(true)
  }, [])
  
  if (!mounted || loading || !data) {
    return <DashboardSkeleton />
  }
  
  if (error) {
    return (
      <div className="min-h-screen app-bg flex flex-col items-center justify-center px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-4">Error Loading Dashboard</h2>
          <p className="text-secondary">{error.message}</p>
          <button 
            onClick={() => refetch()} 
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen app-bg pb-12">
      <div className="w-full max-w-6xl mx-auto px-4 pt-8">
        <DashboardHeader title="Dashboard" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StreakCard 
            streak={data.streak} 
            activityData={data.activityData} 
          />
          
          <ProgressCard 
            data={data.progress} 
          />
          
          <RecentActivityCard 
            activities={data.recentActivity} 
          />
          
          <UpcomingWorkoutsCard 
            workouts={data.upcomingWorkouts} 
          />
          
          <StatsCard 
            data={data.stats} 
          />
          
          <QuickActionsCard />
        </div>
      </div>
    </div>
  )
}