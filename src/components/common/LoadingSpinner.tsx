interface LoadingSpinnerProps {
  text?: string;
}

const LoadingSpinner = ({ text = 'Loading...' }: LoadingSpinnerProps) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <div className="h-12 w-12 border-4 border-border border-t-primary rounded-full animate-spin" />
      <p className="mt-4 text-muted-foreground text-base">{text}</p>
    </div>
  );
};

export default LoadingSpinner;
