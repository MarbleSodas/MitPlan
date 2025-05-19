# FFXIV Mitigation Planner Refactor Roadmap

## Performance Optimization Focus
**Target File:** [`src/App.jsx`](src/App.jsx:324)  
**Primary Goals:**  
- Reduce unnecessary re-renders  
- Optimize effect dependencies  
- Improve drag and drop performance  
- Simplify complex component structure  

## Component Optimization
1. **Split App.jsx into Layout Components**
```jsx
// New: src/components/layout/AppLayout.jsx
export const AppLayout = ({ children }) => (
  <AppContainer>{children}</AppContainer>
);

// New: src/components/layout/HeaderLayout.jsx
export const HeaderLayout = ({ title, description }) => (
  <Header>
    <h1>{title}</h1>
    <p>{description}</p>
  </Header>
);
```

2. **Extract Styled Components to Separate Files**  
   Move these to `src/components/styled/`:
   - `GlobalStyle` (line 51)
   - `DragPreview` (line 279)
   - `TimelineContainer` (line 178)

3. **Create Dedicated Drag Preview Component**  
```jsx
// New: src/components/dnd/DragPreview.jsx
const DragPreview = ({ theme, item }) => (
  <PreviewContainer theme={theme}>
    <PreviewIcon>{item.icon}</PreviewIcon>
    <PreviewContent>
      <PreviewName>{item.name}</PreviewName>
      <PreviewDescription>{item.desc}</PreviewDescription>
    </PreviewContent>
  </PreviewContainer>
);
```

## State Management Improvements
1. **Memoize Context Selectors** (lines 326-362)
```jsx
const selectedJobs = useMemo(() => (
  useJobContext().selectedJobs
), [useJobContext().selectedJobs]);
```

2. **Colocate Mobile State**  
```jsx
// Move to: src/hooks/useDeviceDetection.js
export const useDeviceDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(isMobileDevice());
    const resizeHandler = throttle(checkMobile, 200);
    
    window.addEventListener('resize', resizeHandler);
    return () => window.removeEventListener('resize', resizeHandler);
  }, []);

  return isMobile;
};
```

## Effect Optimization
1. **Review Effect Dependencies** (lines 400-430)
```jsx
// Before
useEffect(() => {
  // Cleanup logic
}, [pendingAssignments]);

// After 
useEffect(() => {
  if (pendingAssignments.length === 0) return;
  
  const timeoutId = setTimeout(() => {
    setPendingAssignments([]);
  }, 1000);

  return () => clearTimeout(timeoutId);
}, [pendingAssignments.length]); // Only track length
```

2. **Throttle Resize Handler**  
```jsx
// Update line 413
const resizeHandler = throttle(checkMobile, 250);
```

## Performance Patterns
1. **Memoize Expensive Operations**  
```jsx
// Line 456: Memoized main render
const mainContent = useMemo(() => (
  <MainContent>
    <TimelineContainer>
      <BossActionsList>
        {sortedBossActions.map(action => (
          <BossActionItem 
            key={action.id} 
            action={action} 
            onClick={memoizedHandleBossActionClick}
          />
        ))}
      </BossActionsList>
    </TimelineContainer>
  </MainContent>
), [sortedBossActions, memoizedHandleBossActionClick]);
```

2. **Virtualize Long Lists**  
```jsx
// Install: react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: sortedBossActions.length,
  estimateSize: () => 80, // Item height
  overscan: 5,
});
```

## Implementation Plan
| Priority | Task                         | Estimated Effort | Owner     |
|----------|------------------------------|------------------|-----------|
| P0       | Component Splitting          | 3 days           | Frontend  |
| P1       | Effect Optimization          | 2 days           | Performance |
| P2       | State Memoization            | 1.5 days         | Core      |
| P3       | Drag Performance Improvements| 2 days           | UI/UX     |

**Metrics Tracking:**
- Use React DevTools Profiler for render counts
- Add performance markers in key sections
- Track with `why-did-you-render`

```jsx
// Add to .env
REACT_APP_PERF_MARKERS=true