import React from "react";
import { Cell as CellType } from "../types/game";
import "./Cell.css";

// Import images from public directory
const coinImage = "/coin.png";
const crossImage = "/cross.png";

interface CellProps {
  cell: CellType;
  gameOver: boolean;
  onLeftClick: (row: number, col: number) => void;
  onRightClick: (row: number, col: number) => void;
}

const CellComponent: React.FC<CellProps> = ({
  cell,
  gameOver,
  onLeftClick,
  onRightClick,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onLeftClick(cell.row, cell.col);
  };

  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onRightClick(cell.row, cell.col);
  };

  const getCellContent = () => {
    if (cell.isFlagged) {
      return "";
    }

    if (!cell.isRevealed) {
      return "";
    }

    if (cell.hasCoin) {
      return "🪙";
    }

    if (cell.neighborCoins === 0) {
      return "";
    }

    return cell.neighborCoins.toString();
  };

  const getCellClassName = () => {
    let className = "cell";

    if (cell.isRevealed) {
      className += " revealed";
      if (cell.hasCoin) {
        className += " coin";
      } else if (cell.neighborCoins > 0) {
        className += ` neighbor-${cell.neighborCoins}`;
      }
    } else {
      className += " hidden";
      if (cell.isFlagged) {
        className += " flagged";
      }
    }

    if (gameOver && cell.hasCoin && !cell.isRevealed) {
      className += " game-over-coin";
    }

    return className;
  };

  const getCellStyle = () => {
    const style: React.CSSProperties = {};
    
    if (!cell.isRevealed && cell.hasCoin) {
      style.backgroundImage = `url(${coinImage})`;
    } else if (cell.isFlagged) {
      style.backgroundImage = `url(${crossImage})`;
    }
    
    return style;
  };

  return (
    <div
      className={getCellClassName()}
      style={getCellStyle()}
      onClick={handleClick}
      onContextMenu={handleRightClick}
      data-row={cell.row}
      data-col={cell.col}
    >
      {getCellContent()}
    </div>
  );
};

export default CellComponent;
