export interface NavItem {
  id: string;
  label: string;
  desc: string;
  to: string;
  icon: string;
  badge?: 'NEW' | 'SIM';
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    id: 'home',
    label: 'Home',
    items: [
      {
        id: 'landing',
        label: 'Landing Page',
        desc: 'Return to expedition briefing and overview',
        to: '/',
        icon: 'Home'
      },
      {
        id: 'layers',
        label: 'Mars Layers',
        desc: 'Interactive map: Viking, MOLA relief, elevation, checkpoints',
        to: '/map',
        icon: 'Layers'
      },
      {
        id: 'satellite',
        label: 'Satellite View',
        desc: 'NASA orbital imagery for any site',
        to: '/satellite',
        icon: 'Satellite'
      },
      {
        id: 'skydome',
        label: 'Mars Sky Dome',
        desc: 'Sun, stars, Phobos, Deimos and Earth for any place and time',
        to: '/sky',
        icon: 'Orbit'
      }
    ]
  },
  {
    id: 'mission',
    label: 'Mission Planning',
    items: [
      {
        id: 'route',
        label: 'Route Planner',
        desc: 'A* routes with slope and data-coverage checks',
        to: '/planner/route',
        icon: 'Route'
      },
      {
        id: 'builder',
        label: 'Mission Builder',
        desc: 'Choose sites, objectives, vehicle and crew',
        to: '/planner',
        icon: 'ClipboardList'
      },
      {
        id: 'compare',
        label: 'Compare Routes',
        desc: 'Shortest vs lowest-risk, side by side',
        to: '/planner/compare',
        icon: 'GitCompare'
      },
      {
        id: 'briefing',
        label: 'Mission Briefing',
        desc: 'Printable summary, export and share link',
        to: '/planner/briefing',
        icon: 'FileText'
      },
      {
        id: 'rover',
        label: 'Rover Explorer',
        desc: 'Curiosity, Perseverance, Spirit, Opportunity tracks',
        to: '/rovers',
        icon: 'Compass'
      }
    ]
  },
  {
    id: 'survival',
    label: 'Survival & Field Manual',
    items: [
      {
        id: 'center',
        label: 'Survival Center',
        desc: 'Oxygen, water, food, power, radiation dashboard',
        to: '/survival',
        icon: 'ShieldCheck',
        badge: 'SIM'
      },
      {
        id: 'manual',
        label: 'Field Manual',
        desc: 'Searchable survival handbook',
        to: '/manual',
        icon: 'BookOpen'
      },
      {
        id: 'terrain',
        label: 'Terrain Analysis',
        desc: 'Slope, roughness and quality score of any point',
        to: '/terrain',
        icon: 'Mountain'
      },
      {
        id: 'hazards',
        label: 'Hazard Intelligence',
        desc: 'Scarps, dunes, RSL slopes, dust-devil terrain',
        to: '/hazards',
        icon: 'TriangleAlert'
      },
      {
        id: 'science',
        label: 'Science Targets',
        desc: 'Minerals, water-ice zones and sample sites',
        to: '/science',
        icon: 'FlaskConical'
      },
      {
        id: 'weather',
        label: 'Weather Telemetry',
        desc: 'Modeled temperature, MEDA anchor, dust, sky',
        to: '/weather',
        icon: 'CloudSun'
      }
    ]
  }
];

export const RAIL_ITEMS = [
  { id: 'landing', label: 'Home', to: '/', icon: 'Home' },
  { id: 'map', label: 'Interactive Map', to: '/map', icon: 'Layers' },
  { id: 'manual', label: 'Field Manual', to: '/manual', icon: 'BookOpen' },
  { id: 'survival', label: 'Survival Center', to: '/survival', icon: 'ShieldCheck' },
  { id: 'planner', label: 'Mission Planner', to: '/planner', icon: 'ClipboardList' }
];

export const BOTTOM_TABS = [
  { id: 'explore', label: 'Explore', to: '/map', icon: 'Layers' },
  { id: 'survive', label: 'Survive', to: '/survival', icon: 'ShieldCheck' },
  { id: 'discover', label: 'Discover', to: '/manual', icon: 'BookOpen' },
  { id: 'plan', label: 'Plan', to: '/planner', icon: 'ClipboardList' }
];
