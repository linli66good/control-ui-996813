import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './layout/AppLayout'
import Dashboard from './pages/Dashboard'
import SheetRangeViewer from './pages/SheetRangeViewer'
import News from './pages/News'
import Learn from './pages/Learn'
import Comp from './pages/Comp'
import Analysis from './pages/Analysis'
import InputsAsin from './pages/InputsAsin'
import InputsKeywords from './pages/InputsKeywords'
import Keywords from './pages/Keywords'
import Inventory from './pages/Inventory'
import Logistics from './pages/Logistics'
import ConfigPage from './pages/ConfigPage'
import Finder from './pages/Finder'

function wrap(el: React.ReactNode) {
  return <AppLayout>{el}</AppLayout>
}

export const router = createBrowserRouter([
  { path: '/', element: wrap(<Dashboard />) },
  { path: '/range', element: wrap(<SheetRangeViewer />) },
  { path: '/news', element: wrap(<News />) },
  { path: '/learn', element: wrap(<Learn />) },
  { path: '/inputs/asins', element: wrap(<InputsAsin />) },
  { path: '/inputs/keywords', element: wrap(<InputsKeywords />) },
  { path: '/comp', element: wrap(<Comp />) },
  { path: '/analysis', element: wrap(<Analysis />) },
  { path: '/finder', element: wrap(<Finder />) },
  { path: '/kw', element: wrap(<Keywords />) },
  { path: '/keywords', element: wrap(<Keywords />) },
  { path: '/inventory', element: wrap(<Inventory />) },
  { path: '/logistics', element: wrap(<Logistics />) },
  { path: '/config', element: wrap(<ConfigPage />) },
])
