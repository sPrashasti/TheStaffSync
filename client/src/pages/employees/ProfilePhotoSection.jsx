import { useRef, useState } from 'react';
import { Button, Stack, Typography } from '@mui/material';
import PhotoCameraOutlinedIcon from '@mui/icons-material/PhotoCameraOutlined';
import { useDispatch, useSelector } from 'react-redux';
import UserAvatar from '../../components/UserAvatar';
import { useSnackbar } from '../../hooks/useSnackbar';
import { removeMyPhoto, uploadMyPhoto } from '../../services/profilePhotoService';
import { photoChanged, selectOrganisation, selectUser } from '../../store/authSlice';
import { resizeToSquareJpeg } from '../../utils/resizeImage';

// The signed-in user's photo with upload, replace and remove. The image is cropped to a square and
// shrunk in the browser before it is sent. Turned off in the shared demo accounts.
function ProfilePhotoSection() {
  const dispatch = useDispatch();
  const toast = useSnackbar();
  const user = useSelector(selectUser);
  const organisation = useSelector(selectOrganisation);
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const isDemo = Boolean(organisation?.isDemo);

  const choose = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const blob = await resizeToSquareJpeg(file);
      const { photoUpdatedAt } = await uploadMyPhoto(blob);
      dispatch(photoChanged(photoUpdatedAt));
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Unable to upload the photo. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await removeMyPhoto();
      dispatch(photoChanged(null));
      toast.success('Profile photo removed');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} sx={{ alignItems: { xs: 'flex-start', sm: 'center' } }}>
      <UserAvatar userId={user._id} name={user.name} photoUpdatedAt={user.photoUpdatedAt} size={88} sx={{ fontSize: 32 }} />
      <Stack spacing={1}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{user.name}</Typography>
        {isDemo ? (
          <Typography variant="body2" color="text.secondary">Profile photos cannot be changed in the demo.</Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }} useFlexGap>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={choose} aria-label="Choose a profile photo" />
            <Button size="small" variant="outlined" startIcon={<PhotoCameraOutlinedIcon />} disabled={busy} onClick={() => input.current?.click()}>
              {busy ? 'Saving…' : user.photoUpdatedAt ? 'Change photo' : 'Upload photo'}
            </Button>
            {user.photoUpdatedAt && (
              <Button size="small" color="inherit" disabled={busy} onClick={remove}>Remove</Button>
            )}
          </Stack>
        )}
        {!isDemo && <Typography variant="caption" color="text.secondary">JPEG, PNG or WebP. It is cropped to a square.</Typography>}
      </Stack>
    </Stack>
  );
}

export default ProfilePhotoSection;
