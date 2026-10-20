import { useState } from 'react';
import { Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import { GOLD, MUTED, TEXT } from './landingStyles';

// A text field for the landing: the label sits above the box and an icon leads the value.
// The box is a lighter pane of the frosted panel it sits in. `error` is the message to show (or nothing),
// so callers need not pass it twice. Password fields get a show/hide toggle.
// `dense` gives a shorter box and tighter label, for forms that must fit on one screen.
function LandingField({ id, label, type = 'text', icon: Icon, error, helperText, dense = false, ...props }) {
  const [shown, setShown] = useState(false);
  const isPassword = type === 'password';
  return (
    <Box>
      <Typography component="label" htmlFor={id} sx={{ display: 'block', color: TEXT, fontSize: dense ? 13 : 14, fontWeight: 500, mb: dense ? 0.5 : 0.75 }}>
        {label}
      </Typography>
      <TextField
        id={id}
        type={isPassword && shown ? 'text' : type}
        fullWidth
        error={Boolean(error)}
        helperText={error || helperText}
        slotProps={{
          input: {
            startAdornment: Icon && (
              <InputAdornment position="start">
                <Icon fontSize="small" sx={{ color: error ? 'error.main' : GOLD }} />
              </InputAdornment>
            ),
            endAdornment: isPassword && (
              <InputAdornment position="end">
                <IconButton
                  size="small"
                  edge="end"
                  onClick={() => setShown((s) => !s)}
                  aria-label={shown ? 'Hide password' : 'Show password'}
                  sx={{ color: MUTED }}
                >
                  {shown ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
        sx={{
          // A translucent pane with a fine edge, gold when focused.
          '& .MuiOutlinedInput-root': { bgcolor: 'var(--glass-field)', borderRadius: dense ? '12px' : '16px' },
          ...(dense && { '& .MuiOutlinedInput-input': { py: 1.15, fontSize: 14.5 } }),
          '& .MuiOutlinedInput-root:not(.Mui-focused):not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--glass-field-border)' },
          // Browsers paint saved logins blue; cover that with the field's own colour.
          '& input:-webkit-autofill': {
            WebkitBoxShadow: '0 0 0 100px var(--glass-autofill) inset',
            WebkitTextFillColor: 'var(--hero-text)',
            caretColor: 'var(--hero-text)',
            borderRadius: 'inherit',
          },
          '& .MuiOutlinedInput-root.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--champagne)' },
          '& .MuiFormHelperText-root': { mx: 0.5 },
        }}
        {...props}
      />
    </Box>
  );
}

export default LandingField;
