import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

type Overview = {
  likes: number
  comments: number
  impressions: number
  savesOrBookmarks: number
  shares: number
}

type Post = {
  _id: string
  platform: 'linkedin' | 'x'
  externalPostId: string
  accountName: string
  content: string
  publishedAt: string
}

type TimeseriesPoint = {
  date: string
  likes: number
  comments: number
  impressions: number
  savesOrBookmarks: number
  shares: number
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000'

function App() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [series, setSeries] = useState<TimeseriesPoint[]>([])
  const [selectedPostId, setSelectedPostId] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingSeries, setLoadingSeries] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError('')

      try {
        const [overviewResponse, postsResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/api/overview`),
          fetch(`${API_BASE_URL}/api/posts`),
        ])

        if (!overviewResponse.ok || !postsResponse.ok) {
          throw new Error('Unable to load dashboard data.')
        }

        const overviewData = (await overviewResponse.json()) as Overview
        const postsData = (await postsResponse.json()) as Post[]

        setOverview(overviewData)
        setPosts(postsData)

        if (postsData.length > 0) {
          setSelectedPostId(postsData[0]._id)
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  useEffect(() => {
    if (!selectedPostId) {
      setSeries([])
      return
    }

    async function loadSeries() {
      setLoadingSeries(true)
      setError('')

      try {
        const response = await fetch(`${API_BASE_URL}/api/posts/${selectedPostId}/timeseries`)

        if (!response.ok) {
          throw new Error('Unable to load post trend data.')
        }

        const data = (await response.json()) as TimeseriesPoint[]
        setSeries(data)
      } catch (seriesError) {
        setError(seriesError instanceof Error ? seriesError.message : 'Unknown error')
      } finally {
        setLoadingSeries(false)
      }
    }

    loadSeries()
  }, [selectedPostId])

  const selectedPost = useMemo(
    () => posts.find((post) => post._id === selectedPostId) ?? null,
    [posts, selectedPostId]
  )

  const formatNumber = (value: number) => new Intl.NumberFormat('en-US').format(value)

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })

  const selectedSeries = useMemo(
    () =>
      series.map((point) => {
        const engagement =
          point.likes + point.comments + point.savesOrBookmarks + point.shares
        const engagementRate =
          point.impressions > 0 ? Number(((engagement / point.impressions) * 100).toFixed(2)) : 0

        return {
          ...point,
          engagement,
          engagementRate,
        }
      }),
    [series]
  )

  const latestPoint = selectedSeries[selectedSeries.length - 1]
  const previousPoint = selectedSeries[selectedSeries.length - 2]

  const velocityData = useMemo(() => {
    if (!latestPoint || !previousPoint) {
      return []
    }

    return [
      {
        metric: 'Likes',
        delta: latestPoint.likes - previousPoint.likes,
      },
      {
        metric: 'Comments',
        delta: latestPoint.comments - previousPoint.comments,
      },
      {
        metric: 'Impressions',
        delta: latestPoint.impressions - previousPoint.impressions,
      },
      {
        metric: 'Saves',
        delta: latestPoint.savesOrBookmarks - previousPoint.savesOrBookmarks,
      },
      {
        metric: 'Shares',
        delta: latestPoint.shares - previousPoint.shares,
      },
    ]
  }, [latestPoint, previousPoint])

  const snapshotBreakdown = useMemo(() => {
    if (!latestPoint) {
      return []
    }

    return [
      { name: 'Likes', value: latestPoint.likes },
      { name: 'Comments', value: latestPoint.comments },
      { name: 'Saves', value: latestPoint.savesOrBookmarks },
      { name: 'Shares', value: latestPoint.shares },
    ]
  }, [latestPoint])

  const overviewMix = useMemo(() => {
    if (!overview) {
      return []
    }

    return [
      { name: 'Likes', value: overview.likes },
      { name: 'Comments', value: overview.comments },
      { name: 'Saves', value: overview.savesOrBookmarks },
      { name: 'Shares', value: overview.shares },
    ]
  }, [overview])

  const mixColors = ['#da6b61', '#73c476', '#5590f3', '#e1b75c']

  if (loading) {
    return <main className="app-shell">Loading dashboard...</main>
  }

  if (error && posts.length === 0) {
    return <main className="app-shell">Error: {error}</main>
  }

  return (
    <main className="app-shell">
      <header className="hero-panel">
        <p className="eyebrow">MigaLabs Social - Signal Desk</p>
        <h1>Performance Ledger</h1>
        <p className="hero-copy">
          A working studio for trend arcs, metric momentum, and signal quality from synthetic LinkedIn + X data.
        </p>
      </header>

      <section className="overview-grid" aria-label="Overview metrics">
        <article className="metric-card">
          <h2>Total Likes</h2>
          <p>{formatNumber(overview?.likes ?? 0)}</p>
        </article>
        <article className="metric-card">
          <h2>Total Comments</h2>
          <p>{formatNumber(overview?.comments ?? 0)}</p>
        </article>
        <article className="metric-card">
          <h2>Total Impressions</h2>
          <p>{formatNumber(overview?.impressions ?? 0)}</p>
        </article>
        <article className="metric-card">
          <h2>Saves + Bookmarks</h2>
          <p>{formatNumber(overview?.savesOrBookmarks ?? 0)}</p>
        </article>
      </section>

      <section className="content-grid">
        <article className="panel post-panel">
          <div className="panel-title-row">
            <h2>Posts</h2>
            <span>{posts.length} records</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Platform</th>
                  <th>Account</th>
                  <th>Content</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((post) => (
                  <tr
                    key={post._id}
                    className={selectedPostId === post._id ? 'is-selected' : ''}
                    onClick={() => setSelectedPostId(post._id)}
                  >
                    <td>{post.platform.toUpperCase()}</td>
                    <td>{post.accountName}</td>
                    <td>{post.content}</td>
                    <td>{formatDate(post.publishedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel chart-panel">
          <div className="panel-title-row">
            <h2>Trend Arc</h2>
            <span>{selectedPost?.externalPostId ?? 'No post selected'}</span>
          </div>

          <p className="selected-content">{selectedPost?.content ?? 'Select a post from the table.'}</p>

          {loadingSeries ? (
            <p>Loading trend series...</p>
          ) : (
            <div className="chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={selectedSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#3d4354" />
                  <XAxis dataKey="date" tickFormatter={formatDate} />
                  <YAxis />
                  <Tooltip
                    labelFormatter={(value) => formatDate(String(value))}
                    formatter={(value) => formatNumber(Number(value ?? 0))}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="likes" stroke="#fd8b5d" strokeWidth={2.5} dot={false} />
                  <Line
                    type="monotone"
                    dataKey="comments"
                    stroke="#5590f3"
                    strokeWidth={2.5}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="#73c476"
                    strokeWidth={2.5}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {error && <p className="error-text">{error}</p>}
        </article>
      </section>

      <section className="chart-grid-secondary">
        <article className="panel">
          <div className="panel-title-row">
            <h2>Engagement Ratio</h2>
            <span>per day</span>
          </div>
          <div className="chart-wrap compact">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={selectedSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d4354" />
                <XAxis dataKey="date" tickFormatter={formatDate} />
                <YAxis unit="%" />
                <Tooltip
                  labelFormatter={(value) => formatDate(String(value))}
                  formatter={(value) => `${Number(value ?? 0).toFixed(2)}%`}
                />
                <Area
                  type="monotone"
                  dataKey="engagementRate"
                  stroke="#8c79e0"
                  fill="#2f2f4d"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Daily Momentum</h2>
            <span>latest delta</span>
          </div>
          <div className="chart-wrap compact">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#3d4354" />
                <XAxis dataKey="metric" />
                <YAxis />
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Bar dataKey="delta" fill="#00aad0" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Selected Post Mix</h2>
            <span>latest snapshot</span>
          </div>
          <div className="chart-wrap compact pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={snapshotBreakdown}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={4}
                >
                  {snapshotBreakdown.map((entry, index) => (
                    <Cell key={entry.name} fill={mixColors[index % mixColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="panel">
          <div className="panel-title-row">
            <h2>Portfolio Mix</h2>
            <span>all posts</span>
          </div>
          <div className="chart-wrap compact pie">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={overviewMix}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={4}
                >
                  {overviewMix.map((entry, index) => (
                    <Cell key={entry.name} fill={mixColors[index % mixColors.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(Number(value ?? 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>
    </main>
  )
}

export default App
