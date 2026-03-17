import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import Dashboard from './pages/Dashboard'
import SheetRangeViewer from './pages/SheetRangeViewer'
import Placeholder from './pages/Placeholder'

function wrap(el: React.ReactNode) {
  return <AppLayout>{el}</AppLayout>
}

export const router = createBrowserRouter([
  { path: '/', element: wrap(<Dashboard />) },
  { path: '/range', element: wrap(<SheetRangeViewer />) },
  { path: '/news', element: wrap(<Placeholder title="每日新闻" />) },
  { path: '/learn', element: wrap(<Placeholder title="自动学习" />) },
  { path: '/comp', element: wrap(<Placeholder title="竞品监控" />) },
  { path: '/finder', element: wrap(<Placeholder title="选品" />) },
  { path: '/kw', element: wrap(<Placeholder title="关键词/趋势" />) },
  { path: '/inventory', element: wrap(<Placeholder title="库存管理" />) },
  { path: '/logistics', element: wrap(<Placeholder title="物流监控" />) },
  { path: '/config', element: wrap(<Placeholder title="配置" />) },
])
