import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  ButtonGroup,
  Paper,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Grid,
  InputAdornment,
  Link,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import {
  PARTS,
  SYSTEMS,
  categoriesForSystem,
  isPartCompatible,
} from '../data/parts';
import { PRODUCTS } from '../data/products';

function CatalogImage({ src, alt }) {
  const [failed, setFailed] = useState(false);

  return (
    <Box
      sx={{
        width: { xs: 92, sm: 112 },
        height: { xs: 92, sm: 112 },
        flexShrink: 0,
        borderRadius: 2,
        bgcolor: '#F4F5F6',
        display: 'grid',
        placeItems: 'center',
        overflow: 'hidden',
      }}
    >
      {src && !failed ? (
        <Box
          component="img"
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          sx={{ width: '88%', height: '88%', objectFit: 'contain' }}
        />
      ) : (
        <Typography variant="caption" color="grey.600">暂无图片</Typography>
      )}
    </Box>
  );
}

/** Parts library / 图鉴 page with search & filters. */
export default function PartsPage() {
  const [mode, setMode] = useState('parts');
  const [query, setQuery] = useState('');
  const [system, setSystem] = useState('all');
  const [category, setCategory] = useState('all');

  const categoryOptions = useMemo(() => {
    if (system === 'all') return [];
    return categoriesForSystem(system);
  }, [system]);

  const filteredParts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PARTS.filter((p) => {
      if (system !== 'all' && !isPartCompatible(p, system)) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.nameZh.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.nameJa.toLowerCase().includes(q) ||
        p.hasbroName.toLowerCase().includes(q)
      );
    });
  }, [query, system, category]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PRODUCTS.filter((product) => {
      if (system !== 'all' && product.line !== system) return false;
      if (!q) return true;
      return [product.code, product.combo, product.name, product.nameZh, product.nameJa, product.category]
        .some((value) => value.toLowerCase().includes(q));
    });
  }, [query, system]);

  const filtered = mode === 'parts' ? filteredParts : filteredProducts;

  const systemColor = (s) =>
    s === SYSTEMS.CX ? 'secondary' : 'primary';

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Beyblade X 图鉴
      </Typography>

      <ButtonGroup fullWidth sx={{ mb: 1.5 }}>
        <Button
          variant={mode === 'parts' ? 'contained' : 'outlined'}
          onClick={() => {
            setMode('parts');
            setSystem('all');
            setCategory('all');
          }}
        >
          零件（{PARTS.length}）
        </Button>
        <Button
          variant={mode === 'products' ? 'contained' : 'outlined'}
          onClick={() => {
            setMode('products');
            setSystem('all');
            setCategory('all');
          }}
        >
          产品（{PRODUCTS.length}）
        </Button>
      </ButtonGroup>

      <TextField
        fullWidth
        size="small"
        placeholder={mode === 'parts' ? '搜索中文 / 英文 / 日文 / 零件代码' : '搜索产品编号 / 配置 / 名称'}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
        sx={{ mb: 1.5 }}
      />

      <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>{mode === 'parts' ? '系统' : '产品线'}</InputLabel>
          <Select
            value={system}
            label={mode === 'parts' ? '系统' : '产品线'}
            onChange={(e) => {
              setSystem(e.target.value);
              setCategory('all');
            }}
          >
            <MenuItem value="all">全部{mode === 'parts' ? '系统' : '产品线'}</MenuItem>
            {mode === 'parts' ? [
              <MenuItem key="standard" value={SYSTEMS.STANDARD}>Standard（BX / UX）</MenuItem>,
              <MenuItem key="cx" value={SYSTEMS.CX}>CX 系统</MenuItem>,
            ] : [
              <MenuItem key="bx" value="BX">BX</MenuItem>,
              <MenuItem key="ux" value="UX">UX</MenuItem>,
              <MenuItem key="cx" value="CX">CX</MenuItem>,
            ]}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>分类</InputLabel>
          <Select
            value={category}
            label="分类"
            onChange={(e) => setCategory(e.target.value)}
            disabled={mode !== 'parts' || system === 'all'}
          >
            <MenuItem value="all">全部分类</MenuItem>
            {categoryOptions.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Typography variant="caption" color="grey.500">
        共 {filtered.length} 项
      </Typography>

      <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
        {mode === 'parts' ? filteredParts.map((p) => (
          <Grid item xs={12} sm={6} key={p.id}>
            <Paper sx={{ p: 1.5, height: '100%' }} elevation={1}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <CatalogImage src={p.image} alt={p.name} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: .5, alignItems: 'flex-start' }}>
                    <Typography variant="subtitle2" fontWeight={700}>{p.nameZh}</Typography>
                    <Chip size="small" label={p.line} color={systemColor(p.system)} variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="grey.400">{p.name}</Typography>
                  {p.nameJa && <Typography variant="caption" color="grey.500">{p.nameJa}</Typography>}
                  <Box sx={{ mt: .7, display: 'flex', gap: .5, flexWrap: 'wrap' }}>
                    <Chip size="small" label={p.code} />
                    <Chip size="small" label={p.category} variant="outlined" />
                    {p.stat?.[0] && <Chip size="small" label={`规格 ${p.stat[0]}`} variant="outlined" />}
                  </Box>
                </Box>
              </Box>
              {p.desc && (
                <Typography variant="caption" color="grey.400" sx={{ display: 'block', mt: 1, lineHeight: 1.5 }}>
                  {p.desc}
                </Typography>
              )}
            </Paper>
          </Grid>
        )) : filteredProducts.map((product) => (
          <Grid item xs={12} sm={6} key={product.id}>
            <Paper sx={{ p: 1.5, height: '100%' }} elevation={1}>
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <CatalogImage src={product.image} alt={product.name} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: .5 }}>
                    <Typography variant="subtitle2" fontWeight={800}>{product.code}</Typography>
                    <Chip size="small" label={product.line} color={product.line === 'CX' ? 'secondary' : 'primary'} variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="grey.300" sx={{ mt: .5 }}>{product.nameJa}</Typography>
                  {product.combo && <Typography variant="caption" color="grey.500">配置：{product.combo}</Typography>}
                  <Box sx={{ mt: .8, display: 'flex', gap: .5, flexWrap: 'wrap' }}>
                    <Chip size="small" label={product.category || '产品'} />
                    {product.price && <Chip size="small" label={product.price} variant="outlined" />}
                    {product.releaseDate && <Chip size="small" label={product.releaseDate} variant="outlined" />}
                    {product.coat && <Chip size="small" label={product.coat} variant="outlined" />}
                  </Box>
                  <Link href={product.sourceUrl} target="_blank" rel="noreferrer" variant="caption" sx={{ display: 'inline-block', mt: .8 }}>
                    官方详情
                  </Link>
                </Box>
              </Box>
            </Paper>
          </Grid>
        ))}
        {filtered.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="grey.500" sx={{ mt: 2 }}>
              没有匹配的{mode === 'parts' ? '零件' : '产品'}。
            </Typography>
          </Grid>
        )}
      </Grid>

      <Typography variant="caption" color="grey.600" sx={{ display: 'block', mt: 2 }}>
        数据与零件图来源：go-shoot Beyblade X 非官方资料库；产品信息请以 Takara Tomy 官方发布为准。
      </Typography>
    </Box>
  );
}
