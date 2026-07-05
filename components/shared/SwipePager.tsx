import React, { forwardRef, useEffect } from 'react';
import PagerView from 'react-native-pager-view';
import { useRef } from 'react';

interface Props {
  page?: number;
  initialPage?: number;
  onPageSelected?: (index: number) => void;
  children: React.ReactNode[];
  style?: any;
  pagerRef?: React.MutableRefObject<any>;
}

const SwipePager = forwardRef<any, Props>(function SwipePager(
  { page, initialPage = 0, onPageSelected, children, style, pagerRef },
  ref
) {
  const resolvedRef = pagerRef ?? (ref as React.MutableRefObject<any>);

  // Sync controlled `page` prop to native pager
  useEffect(() => {
    if (page !== undefined) {
      resolvedRef?.current?.setPage(page);
    }
  }, [page]);

  return (
    <PagerView
      ref={resolvedRef}
      style={[{ flex: 1 }, style]}
      initialPage={initialPage}
      onPageSelected={(e) => onPageSelected?.(e.nativeEvent.position)}
    >
      {children}
    </PagerView>
  );
});

export default SwipePager;

export function usePagerRef() {
  return useRef<any>(null);
}
