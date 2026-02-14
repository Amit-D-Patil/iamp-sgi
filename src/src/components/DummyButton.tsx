import React, { useState } from "react";
import { Button } from "./ui/button";

type ButtonStatus = "idle" | "loading" | "saved";

interface DummyButtonProps {
  label: string;
  className?: string;
}

const DummyButton: React.FC<DummyButtonProps> = ({ label, className }) => {
  const [status, setStatus] = useState<ButtonStatus>("idle");

  const handleClick = (): void => {
    if (status === "loading") return;

    setStatus("loading");

    setTimeout(() => {
      setStatus("saved");

      // Optional: Reset back after 1.5s
      setTimeout(() => {
        setStatus("idle");
      }, 1500);

    }, 500);
  };

  const getButtonText = (): string => {
    switch (status) {
      case "loading":
        return "Loading...";
      case "saved":
        return "Saved";
      default:
        return label;
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={status === "loading"}
      className={className}
    >
      {getButtonText()}
    </Button>
  );
};

export default DummyButton;
