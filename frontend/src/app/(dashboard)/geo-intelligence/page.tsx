'use client';

import dynamic from 'next/dynamic';
import { GlassPanel } from '@/components/panels/glass-panel';
import { useInvestigation } from '@/context/investigation-context';

const Map = dynamic(() => import('@/components/map/MapComponent'), { ssr: false });

export default function GeoIntelligencePage() {
  const {
    selectedEntityId,
    selectEntity,
    selectCamera,
    selectSignal,
    selectLocation,
    layers,
  } = useInvestigation();

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Map
        selectedEntityId={selectedEntityId}
        onSelectEntity={selectEntity}
        onSelectCamera={selectCamera}
        onSelectSignal={selectSignal}
        onSelectLocation={selectLocation}
        layerVisibility={layers}
      />
      
      <div className="absolute right-4 top-4 bottom-4 w-80 flex flex-col gap-4 pointer-events-none z-10">
        <GlassPanel title="GEO INTELLIGENCE" className="pointer-events-auto h-full bg-crimenet-panel/80">
          <div className="text-sm text-white/70">
            Select map features to analyze geospatial clustering and event density.
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

