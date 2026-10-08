import { Box, Stack, Typography } from '@mui/material';

// Page title with an optional subtitle and actions (buttons) on the right.
function PageHeader({ title, subtitle, actions }) {
  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={2}
      sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 3 }}
    >
      <Box>
        <Typography variant="h5" component="h1" sx={{ fontWeight: 700 }}>{title}</Typography>
        {subtitle && <Typography color="text.secondary">{subtitle}</Typography>}
      </Box>
      {actions && <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>{actions}</Stack>}
    </Stack>
  );
}

export default PageHeader;
