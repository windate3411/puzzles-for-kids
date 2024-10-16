import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "./App.css";

type MazeCell = {
  x: number;
  y: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
  isEntrance?: boolean;
  isExit?: boolean;
};

type MazeSize = 10 | 15 | 20;

function App() {
  const [mazeSize, setMazeSize] = useState<MazeSize>(10);
  const [maze, setMaze] = useState<MazeCell[][]>([]);
  const [avatarPosition, setAvatarPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const mazeRef = useRef<HTMLDivElement>(null);
  const [showAvatar, setShowAvatar] = useState(true);

  const getUnvisitedNeighbors = useCallback(
    (cell: MazeCell, maze: MazeCell[][]) => {
      const { x, y } = cell;
      const neighbors: MazeCell[] = [];

      if (y > 0 && !maze[y - 1][x].visited) neighbors.push(maze[y - 1][x]); // Top
      if (x < mazeSize - 1 && !maze[y][x + 1].visited)
        neighbors.push(maze[y][x + 1]); // Right
      if (y < mazeSize - 1 && !maze[y + 1][x].visited)
        neighbors.push(maze[y + 1][x]); // Bottom
      if (x > 0 && !maze[y][x - 1].visited) neighbors.push(maze[y][x - 1]); // Left

      return neighbors;
    },
    [mazeSize]
  );

  const generateMaze = useCallback(() => {
    const newMaze: MazeCell[][] = Array(mazeSize)
      .fill(null)
      .map((_, y) =>
        Array(mazeSize)
          .fill(null)
          .map((_, x) => ({
            x,
            y,
            walls: { top: true, right: true, bottom: true, left: true },
            visited: false,
          }))
      );

    const stack: MazeCell[] = [];
    const startCell = newMaze[0][0];
    startCell.visited = true;
    stack.push(startCell);

    while (stack.length > 0) {
      const currentCell = stack.pop()!;
      const neighbors = getUnvisitedNeighbors(currentCell, newMaze);

      if (neighbors.length > 0) {
        stack.push(currentCell);
        const nextCell =
          neighbors[Math.floor(Math.random() * neighbors.length)];
        removeWallBetween(currentCell, nextCell);
        nextCell.visited = true;
        stack.push(nextCell);
      }
    }

    // Mark entrance and exit
    newMaze[0][0].isEntrance = true;
    newMaze[0][0].walls.left = false;
    newMaze[mazeSize - 1][mazeSize - 1].isExit = true;
    newMaze[mazeSize - 1][mazeSize - 1].walls.bottom = false;

    // Set the avatar at the entrance
    setAvatarPosition({ x: 0, y: 0 });

    setMaze(newMaze);
  }, [mazeSize, getUnvisitedNeighbors]);

  const removeWallBetween = (cell1: MazeCell, cell2: MazeCell) => {
    const dx = cell2.x - cell1.x;
    const dy = cell2.y - cell1.y;

    if (dx === 1) {
      cell1.walls.right = false;
      cell2.walls.left = false;
    } else if (dx === -1) {
      cell1.walls.left = false;
      cell2.walls.right = false;
    } else if (dy === 1) {
      cell1.walls.bottom = false;
      cell2.walls.top = false;
    } else if (dy === -1) {
      cell1.walls.top = false;
      cell2.walls.bottom = false;
    }
  };

  useEffect(() => {
    generateMaze();
  }, [generateMaze]);

  function solveMaze() {
    const path: { x: number; y: number }[] = [];
    const stack: { cell: MazeCell; path: { x: number; y: number }[] }[] = [];
    const visited: boolean[][] = Array(mazeSize)
      .fill(null)
      .map(() => Array(mazeSize).fill(false));

    const startCell = maze[0][0];
    const endCell = maze[mazeSize - 1][mazeSize - 1];
    stack.push({ cell: startCell, path: [{ x: startCell.x, y: startCell.y }] });

    while (stack.length > 0) {
      const current = stack.pop()!;
      const { cell: currentCell, path: currentPath } = current;
      const { x, y } = currentCell;

      if (x === endCell.x && y === endCell.y) {
        path.push(...currentPath);
        break;
      }

      if (!visited[y][x]) {
        visited[y][x] = true;
        const neighbors = [
          { dx: 0, dy: -1, wall: "top" },
          { dx: 1, dy: 0, wall: "right" },
          { dx: 0, dy: 1, wall: "bottom" },
          { dx: -1, dy: 0, wall: "left" },
        ];

        for (const { dx, dy, wall } of neighbors) {
          const newX = x + dx;
          const newY = y + dy;

          if (
            newX >= 0 &&
            newX < mazeSize &&
            newY >= 0 &&
            newY < mazeSize &&
            !visited[newY][newX] &&
            !currentCell.walls[wall as keyof typeof currentCell.walls]
          ) {
            const nextCell = maze[newY][newX];
            const newPath = [...currentPath, { x: newX, y: newY }];
            stack.push({ cell: nextCell, path: newPath });
          }
        }
      }
    }

    if (path.length > 0) {
      animateSolution(path);
    }
  }

  function animateSolution(path: { x: number; y: number }[]) {
    let i = 0;
    setAvatarPosition(path[0]);
    const interval = setInterval(() => {
      if (i < path.length - 1) {
        i++;
        setAvatarPosition(path[i]);
      } else {
        clearInterval(interval);
      }
    }, 100);
  }

  const downloadMaze = () => {
    if (mazeRef.current) {
      setShowAvatar(false);
      setTimeout(() => {
        html2canvas(mazeRef.current!).then((canvas) => {
          const link = document.createElement("a");
          link.download = "maze_without_avatar.png";
          link.href = canvas.toDataURL();
          link.click();
          setShowAvatar(true);
        });
      }, 0);
    }
  };

  const isGameWon =
    avatarPosition.x === mazeSize - 1 && avatarPosition.y === mazeSize - 1;

  const moveAvatar = useCallback(
    (dx: number, dy: number) => {
      if (isGameWon) return;
      setAvatarPosition((prev) => {
        const newX = prev.x + dx;
        const newY = prev.y + dy;

        // Check if the new position is valid (within maze bounds and no wall)
        if (newX >= 0 && newX < mazeSize && newY >= 0 && newY < mazeSize) {
          const currentCell = maze[prev.y][prev.x];
          if (
            (dx === 1 && !currentCell.walls.right) ||
            (dx === -1 && !currentCell.walls.left) ||
            (dy === 1 && !currentCell.walls.bottom) ||
            (dy === -1 && !currentCell.walls.top)
          ) {
            return { x: newX, y: newY };
          }
        }
        return prev;
      });
    },
    [maze, mazeSize, isGameWon]
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          moveAvatar(0, -1);
          break;
        case "ArrowDown":
          moveAvatar(0, 1);
          break;
        case "ArrowLeft":
          moveAvatar(-1, 0);
          break;
        case "ArrowRight":
          moveAvatar(1, 0);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [moveAvatar, isGameWon]);

  const startNewGame = () => {
    generateMaze();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-300 to-purple-300 p-4">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-3xl">
        <h1 className="text-4xl font-bold mb-4 text-center text-indigo-600">
          Maze Adventure
        </h1>
        <div className="mb-4">
          <label
            htmlFor="maze-size"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Choose your difficulty:
          </label>
          <Select
            value={mazeSize.toString()}
            onValueChange={(value) => setMazeSize(parseInt(value) as MazeSize)}
          >
            <SelectTrigger className="w-full border-2 border-indigo-300 rounded-md">
              <SelectValue placeholder="Select maze size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10x10 (Easy Peasy!)</SelectItem>
              <SelectItem value="15">15x15 (Getting Tricky!)</SelectItem>
              <SelectItem value="20">20x20 (Super Challenge!)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-center mb-4">
          <p className="text-lg text-gray-700">
            Help the fox find its way through the maze!
          </p>
          <p className="text-sm text-gray-500">
            Use the arrow keys to move the fox, or click 'Solve Maze' to see the
            solution.
          </p>
        </div>
        <div
          ref={mazeRef}
          className="mb-4 bg-gray-100 rounded-lg shadow-inner"
          style={{
            width: "100%",
            maxWidth: "500px",
            margin: "0 auto",
            aspectRatio: "1 / 1",
          }}
        >
          {maze.map((row, y) => (
            <div key={y} className="flex">
              {row.map((cell, x) => (
                <div
                  key={`${x}-${y}`}
                  className="relative"
                  style={{
                    width: `${100 / mazeSize}%`,
                    paddingBottom: `${100 / mazeSize}%`,
                  }}
                >
                  <div
                    className="absolute inset-0 border-gray-400 flex items-center justify-center"
                    style={{
                      borderTopWidth: cell.walls.top ? "1px" : "0",
                      borderRightWidth: cell.walls.right ? "1px" : "0",
                      borderBottomWidth: cell.walls.bottom ? "1px" : "0",
                      borderLeftWidth: cell.walls.left ? "1px" : "0",
                    }}
                  >
                    {cell.isEntrance && (
                      <span className="text-green-600 font-bold">→</span>
                    )}
                    {cell.isExit && (
                      <span className="text-red-600 font-bold">↓</span>
                    )}
                    {showAvatar &&
                      avatarPosition &&
                      avatarPosition.x === x &&
                      avatarPosition.y === y && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <img
                            src="/avatar.png"
                            alt="Avatar"
                            className="w-3/4 h-3/4 object-contain"
                          />
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-center space-x-4 mt-4">
          <Button
            className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
            onClick={generateMaze}
          >
            Generate Maze
          </Button>
          <Button
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
            onClick={solveMaze}
          >
            Solve Maze
          </Button>
          <Button
            className="bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-full transition duration-300 ease-in-out transform hover:scale-105"
            onClick={downloadMaze}
          >
            Download Maze
          </Button>
        </div>
      </div>
      {isGameWon && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-4">Congratulations!</h2>
            <p className="mb-4">You've successfully navigated the maze!</p>
            <Button onClick={startNewGame}>Start New Game</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
