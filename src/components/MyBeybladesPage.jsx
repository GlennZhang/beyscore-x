import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Fab,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import ToysIcon from '@mui/icons-material/Toys';
import CloseIcon from '@mui/icons-material/Close';

import { useApp } from '../context/AppContext';
import {
  SYSTEMS,
  COMBO_SCHEMAS,
  partLabel,
  partsByCategory,
} from '../data/parts';

/** Combo editor dialog (add / edit a Beyblade combination). */
function ComboEditorDialog({ open, onClose, team, combo }) {
  const { addCombo, updateCombo } = useApp();
  const isEdit = Boolean(combo);

  const [name, setName] = useState(combo?.name || '');
  const [system, setSystem] = useState(combo?.system || SYSTEMS.STANDARD);
  const [parts, setParts] = useState(combo?.parts || {});

  // Reset transient state whenever the dialog opens for a (new) target.
  React.useEffect(() => {
    if (open) {
      setName(combo?.name || '');
      setSystem(combo?.system || SYSTEMS.STANDARD);
      setParts(combo?.parts || {});
    }
  }, [open, combo]);

  const schema = COMBO_SCHEMAS[system];

  const onSystemChange = (next) => {
    setSystem(next);
    setParts({});
  };

  const save = () => {
    const payload = { name: name.trim() || '未命名陀螺', system, parts };
    if (isEdit) updateCombo(team.id, combo.id, payload);
    else addCombo(team.id, payload);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {isEdit ? '编辑陀螺组合' : '添加陀螺组合'}
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          label="组合名称"
          value={name}
          onChange={(e) => setName(e.target.value)}
          sx={{ mt: 1, mb: 1.5 }}
        />
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>系统</InputLabel>
          <Select
            value={system}
            label="系统"
            onChange={(e) => onSystemChange(e.target.value)}
          >
            <MenuItem value={SYSTEMS.STANDARD}>Standard 标准系统</MenuItem>
            <MenuItem value={SYSTEMS.CX}>CX 系统</MenuItem>
          </Select>
        </FormControl>

        <Divider sx={{ mb: 1.5 }} />
        <Typography variant="subtitle2" gutterBottom>
          部件选择
        </Typography>
        <Stack spacing={1.5}>
          {schema.map((slot) => (
            <FormControl fullWidth size="small" key={slot.key}>
              <InputLabel>{slot.label}</InputLabel>
              <Select
                value={parts[slot.key] || ''}
                label={slot.label}
                onChange={(e) =>
                  setParts((prev) => ({ ...prev, [slot.key]: e.target.value }))
                }
              >
                <MenuItem value="">不选</MenuItem>
                {partsByCategory(system, slot.category).map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nameZh} · {p.name} ({p.code})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>取消</Button>
        <Button variant="contained" onClick={save}>
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}

/** A single Beyblade combination card. */
function ComboCard({ combo, onEdit, onDelete }) {
  const schema = COMBO_SCHEMAS[combo.system] || [];
  return (
    <Paper sx={{ p: 1.5, mb: 1 }} elevation={1}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ToysIcon fontSize="small" color="primary" />
          <Typography variant="subtitle2" fontWeight={700}>
            {combo.name}
          </Typography>
          <Chip size="small" label={combo.system} color={combo.system === SYSTEMS.CX ? 'secondary' : 'primary'} variant="outlined" />
        </Box>
        <ListItemSecondaryAction>
          <IconButton size="small" onClick={onEdit}>
            <EditIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={onDelete}>
            <DeleteIcon fontSize="small" />
          </IconButton>
        </ListItemSecondaryAction>
      </Box>
      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {schema.map((slot) => (
          <Chip
            key={slot.key}
            size="small"
            variant="outlined"
            label={`${slot.label.split(' ')[0]}: ${partLabel(combo.parts?.[slot.key])}`}
          />
        ))}
      </Box>
    </Paper>
  );
}

/** My Beyblades / Teams page. */
export default function MyBeybladesPage() {
  const { teams, addTeam, updateTeam, deleteTeam, deleteCombo } = useApp();
  const [teamDialog, setTeamDialog] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [editingTeam, setEditingTeam] = useState(null);

  const [comboDialog, setComboDialog] = useState(false);
  const [activeTeam, setActiveTeam] = useState(null);
  const [editingCombo, setEditingCombo] = useState(null);

  const openTeamDialog = (team = null) => {
    setEditingTeam(team);
    setTeamName(team?.name || '');
    setTeamDialog(true);
  };
  const saveTeam = () => {
    if (editingTeam) updateTeam(editingTeam.id, { name: teamName.trim() || '新战队' });
    else addTeam(teamName.trim());
    setTeamDialog(false);
  };

  const openComboDialog = (team, combo = null) => {
    setActiveTeam(team);
    setEditingCombo(combo);
    setComboDialog(true);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        我的陀螺 / 战队
      </Typography>

      {teams.length === 0 && (
        <Paper sx={{ p: 3, textAlign: 'center' }} elevation={1}>
          <Typography color="grey.500">还没有战队，点击下方按钮新建。</Typography>
        </Paper>
      )}

      {teams.map((team) => (
        <Paper key={team.id} sx={{ p: 2, mb: 2 }} elevation={2}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="subtitle1" fontWeight={800}>
              {team.name}
            </Typography>
            <Box>
              <IconButton size="small" onClick={() => openTeamDialog(team)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => deleteTeam(team.id)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {(team.combos || []).length === 0 ? (
            <Typography variant="body2" color="grey.500">
              该战队还没有陀螺组合。
            </Typography>
          ) : (
            (team.combos || []).map((combo) => (
              <ComboCard
                key={combo.id}
                combo={combo}
                onEdit={() => openComboDialog(team, combo)}
                onDelete={() => {
                  if (window.confirm('删除该陀螺组合？')) {
                    deleteCombo(team.id, combo.id);
                  }
                }}
              />
            ))
          )}

          <Button
            fullWidth
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            sx={{ mt: 1 }}
            onClick={() => openComboDialog(team)}
          >
            添加陀螺组合
          </Button>
        </Paper>
      ))}

      {/* Floating action button to add a team */}
      <Fab
        color="primary"
        aria-label="add team"
        sx={{ position: 'fixed', right: 16, bottom: 80 }}
        onClick={() => openTeamDialog()}
      >
        <AddIcon />
      </Fab>

      {/* Team dialog */}
      <Dialog open={teamDialog} onClose={() => setTeamDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingTeam ? '编辑战队' : '新建战队'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            label="战队名称"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            sx={{ mt: 1 }}
            autoFocus
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTeamDialog(false)}>取消</Button>
          <Button variant="contained" onClick={saveTeam}>
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* Combo editor dialog */}
      {activeTeam && (
        <ComboEditorDialog
          open={comboDialog}
          onClose={() => setComboDialog(false)}
          team={activeTeam}
          combo={editingCombo}
        />
      )}
    </Box>
  );
}
