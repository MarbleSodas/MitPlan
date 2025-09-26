import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useTankPositionContext } from '../../contexts/TankPositionContext';

/**
 * Component for selecting tank positions (MT/OT)
 * Only visible when exactly 2 tank jobs are selected
 */
const TankPositionSelector = () => {
  const { theme } = useTheme();
  const colors = theme.colors;
  const {
    tankPositions,
    assignTankPosition,
    selectedTankJobs,
  } = useTankPositionContext();

  if (selectedTankJobs.length !== 2) return null;

  const containerStyle = { backgroundColor: colors.secondary };
  const titleBorderStyle = { borderBottomColor: colors.border, color: colors.text };
  const cardStyle = { backgroundColor: colors.cardBackground };

  const renderTankCard = (title, roleKey) => (
    <div className="rounded-md p-4 flex flex-col items-center shadow-sm" style={cardStyle}>
      <h4 className="m-0 mb-2 text-center" style={{ color: colors.text }}>{title}</h4>
      <div className="flex flex-wrap justify-center gap-2 w-full">
        {selectedTankJobs.map((tank) => {
          const selected = tankPositions[roleKey] === tank.id;
          const disabled = tankPositions[roleKey === 'mainTank' ? 'offTank' : 'mainTank'] === tank.id;
          const optStyle = {
            backgroundColor: selected ? colors.primary : colors.background,
            opacity: disabled ? 0.5 : 1,
          };
          return (
            <div
              key={`${roleKey}-${tank.id}`}
              className="flex flex-col items-center p-2 rounded-md w-20 transition-all cursor-pointer hover:brightness-105"
              style={optStyle}
              onClick={() => assignTankPosition(tank.id, roleKey)}
            >
              <div className="w-12 h-12 mb-1 flex items-center justify-center">
                {typeof tank.icon === 'string' && tank.icon.startsWith('/') ? (
                  <img src={tank.icon} alt={tank.name} style={{ maxHeight: '48px', maxWidth: '48px' }} />
                ) : (
                  tank.icon
                )}
              </div>
              <div className="text-center text-sm" style={{ color: selected ? colors.buttonText : colors.text }}>
                {tank.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="rounded-md p-4 mb-5 shadow-md transition-colors" style={containerStyle}>
      <h3 className="m-0 mb-4 pb-2 border-b" style={titleBorderStyle}>Tank Positions</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
        {renderTankCard('Main Tank (MT)', 'mainTank')}
        {renderTankCard('Off Tank (OT)', 'offTank')}
      </div>
    </div>
  );
};

export default TankPositionSelector;
