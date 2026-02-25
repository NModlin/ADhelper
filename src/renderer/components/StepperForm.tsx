import React, { useState, useCallback, useEffect, type ReactNode } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  Paper,
  CircularProgress,
  alpha,
  useTheme,
} from '@mui/material';
import { MaterialSymbol } from './MaterialSymbol';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface FormStep {
  /** Label shown in the stepper rail */
  label: string;
  /** Material Symbol icon name */
  icon?: string;
  /** Content rendered for this step */
  content: ReactNode;
  /**
   * Return an array of error messages.
   * Empty array (or undefined return) means the step is valid.
   */
  validate?: () => string[] | undefined;
  /** Whether this step is optional (skippable) */
  optional?: boolean;
}

export interface StepperFormProps {
  /** Ordered list of steps */
  steps: FormStep[];
  /** Called when the user clicks "Complete" on the last step */
  onComplete: () => void;
  /** Called whenever the active step changes */
  onStepChange?: (step: number) => void;
  /** LocalStorage key for draft persistence. Omit to disable drafts. */
  draftKey?: string;
  /** Serialisable form data to persist as draft */
  draftData?: Record<string, unknown>;
  /** Called with restored draft data on mount */
  onRestoreDraft?: (data: Record<string, unknown>) => void;
  /** Show a loading spinner on the Complete button */
  loading?: boolean;
  /** Label for the final action button (default "Complete") */
  completeLabel?: string;
  /** Externally controlled active step (optional – uncontrolled by default) */
  activeStep?: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const StepperForm: React.FC<StepperFormProps> = ({
  steps,
  onComplete,
  onStepChange,
  draftKey,
  draftData,
  onRestoreDraft,
  loading = false,
  completeLabel = 'Complete',
  activeStep: controlledStep,
}) => {
  const theme = useTheme();
  const [internalStep, setInternalStep] = useState(0);
  const activeStep = controlledStep ?? internalStep;
  const setActiveStep = useCallback(
    (s: number) => {
      setInternalStep(s);
      onStepChange?.(s);
    },
    [onStepChange],
  );

  const [errors, setErrors] = useState<string[]>([]);
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  /* ---- Draft persistence ---- */
  useEffect(() => {
    if (!draftKey || !onRestoreDraft) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) onRestoreDraft(JSON.parse(raw));
    } catch {
      /* ignore corrupt drafts */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  const saveDraft = useCallback(() => {
    if (!draftKey || !draftData) return;
    localStorage.setItem(draftKey, JSON.stringify(draftData));
  }, [draftKey, draftData]);

  const clearDraft = useCallback(() => {
    if (draftKey) localStorage.removeItem(draftKey);
  }, [draftKey]);

  /* ---- Navigation helpers ---- */
  const validateCurrent = useCallback((): boolean => {
    const step = steps[activeStep];
    if (!step?.validate) return true;
    const errs = step.validate() ?? [];
    setErrors(errs);
    return errs.length === 0;
  }, [activeStep, steps]);

  const handleNext = useCallback(() => {
    if (!validateCurrent()) return;
    setErrors([]);
    setCompleted((prev) => new Set(prev).add(activeStep));
    if (activeStep === steps.length - 1) {
      clearDraft();
      onComplete();
    } else {
      setActiveStep(activeStep + 1);
    }
  }, [activeStep, steps.length, validateCurrent, setActiveStep, onComplete, clearDraft]);

  const handleBack = useCallback(() => {
    setErrors([]);
    setActiveStep(Math.max(0, activeStep - 1));
  }, [activeStep, setActiveStep]);

  const handleStepClick = useCallback(
    (index: number) => {
      if (index < activeStep || completed.has(index)) {
        setErrors([]);
        setActiveStep(index);
      }
    },
    [activeStep, completed, setActiveStep],
  );

  const isLastStep = activeStep === steps.length - 1;

  return (
    <Box>
      {/* ── Stepper rail ── */}
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {steps.map((step, idx) => (
          <Step
            key={step.label}
            completed={completed.has(idx) && idx !== activeStep}
            sx={{ cursor: idx < activeStep || completed.has(idx) ? 'pointer' : 'default' }}
            onClick={() => handleStepClick(idx)}
          >
            <StepLabel
              optional={step.optional ? <Typography variant="caption">Optional</Typography> : undefined}
              error={idx === activeStep && errors.length > 0}
              StepIconProps={{
                icon: step.icon ? (
                  <MaterialSymbol
                    icon={step.icon}
                    size={20}
                    filled={idx <= activeStep}
                  />
                ) : undefined,
              }}
            >
              {step.label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* ── Validation errors ── */}
      {errors.length > 0 && (
        <Paper
          sx={{
            p: 2,
            mb: 2,
            bgcolor: alpha(theme.palette.error.main, 0.08),
            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
            borderRadius: 2,
          }}
        >
          {errors.map((e, i) => (
            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: i < errors.length - 1 ? 0.5 : 0 }}>
              <MaterialSymbol icon="error" size={18} color="error" />
              <Typography variant="body2" color="error">
                {e}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* ── Step content ── */}
      <Box sx={{ minHeight: 200, mb: 3 }}>{steps[activeStep]?.content}</Box>

      {/* ── Navigation buttons ── */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
          startIcon={<MaterialSymbol icon="arrow_back" size={20} />}
        >
          Back
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {draftKey && draftData && (
            <Button
              variant="outlined"
              onClick={saveDraft}
              disabled={loading}
              startIcon={<MaterialSymbol icon="save" size={20} />}
            >
              Save Draft
            </Button>
          )}

          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
            endIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : isLastStep ? (
                <MaterialSymbol icon="check" size={20} />
              ) : (
                <MaterialSymbol icon="arrow_forward" size={20} />
              )
            }
          >
            {loading ? 'Processing…' : isLastStep ? completeLabel : 'Next'}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default StepperForm;
