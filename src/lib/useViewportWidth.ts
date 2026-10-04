import { useEffect, useState } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * Largura da janela segura para páginas pré-renderizadas (export estático).
 *
 * No servidor a largura é 0 (layout mobile-first). No cliente, `useWindowDimensions`
 * já começa com a largura real, mas o React não corrige estilos divergentes na
 * hidratação, e o layout do servidor ficava congelado. Aqui o valor real só entra
 * depois da montagem, forçando uma nova renderização com a largura certa.
 */
export function useViewportWidth(): number {
  const [width, setWidth] = useState(() => (Platform.OS === 'web' ? 0 : Dimensions.get('window').width));

  useEffect(() => {
    const update = () => setWidth(Dimensions.get('window').width);
    update();
    const sub = Dimensions.addEventListener('change', update);
    return () => sub.remove();
  }, []);

  return width;
}
