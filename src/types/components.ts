import type * as React from 'react';

export interface ClassNameProps {
  className?: string;
}

export interface ChildrenProps {
  children?: React.ReactNode;
}

export type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
export type ButtonSize = 'default' | 'sm' | 'lg' | 'xl' | 'icon';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ClassNameProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export type SheetSide = 'top' | 'bottom' | 'left' | 'right';

export interface SheetContentProps
  extends React.ComponentPropsWithoutRef<'div'>,
    ClassNameProps {
  side?: SheetSide;
}

export type SelectContentPosition = 'popper' | 'item-aligned';

export interface DivComponentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    ClassNameProps {}

export interface TooltipContentProps extends ClassNameProps {
  sideOffset?: number;
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    ClassNameProps {}

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    ClassNameProps {}

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    ClassNameProps {}

export interface CardHeaderProps
  extends React.HTMLAttributes<HTMLDivElement>,
    ClassNameProps {}

export interface CardTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement>,
    ClassNameProps {}

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    ClassNameProps {}

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement>,
    ClassNameProps {}

export interface CardFooterProps
  extends React.HTMLAttributes<HTMLDivElement>,
    ClassNameProps {}

export interface ToasterProps extends React.ComponentProps<'div'> {
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  richColors?: boolean;
}

export type ForwardRefComponent<T, P = object> = React.ForwardRefExoticComponent<
  P & React.RefAttributes<T>
>;
