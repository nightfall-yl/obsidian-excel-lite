// Re-exports from @univerjs/core internal type files to work around
// the package's broken exports field under 'bundler' moduleResolution.
// This file is referenced by univer-facade.d.ts using a non-relative
// module name to avoid TS2439 (relative module names in ambient declarations).
export { IWorkbookData, ICellData, IRange, IWorksheetData, IRowData, IColumnData, IFreeze } from '../node_modules/@univerjs/core/lib/types/sheets/typedef';
export { BooleanNumber, CellValueType, HorizontalAlign, VerticalAlign, WrapStrategy } from '../node_modules/@univerjs/core/lib/types/types/enum/text-style';
export { LocaleType } from '../node_modules/@univerjs/core/lib/types/types/enum/locale-type';
export { IStyleData } from '../node_modules/@univerjs/core/lib/types/types/interfaces/i-style-data';
export type { ILanguagePack } from '../node_modules/@univerjs/core/lib/types/shared/locale';
export { LifecycleStages } from '../node_modules/@univerjs/core/lib/types/services/lifecycle/lifecycle';
export { CommandType, type ICommand, ICommandService } from '../node_modules/@univerjs/core/lib/types/services/command/command.service';
export { IAuthzIoService } from '../node_modules/@univerjs/core/lib/types/services/authz-io/type';
export { Injector } from '../node_modules/@univerjs/core/lib/types/common/di';
export { LocaleService } from '../node_modules/@univerjs/core/lib/types/services/locale/locale.service';
export { LogLevel } from '../node_modules/@univerjs/core/lib/types/services/log/log.service';
export { UserManagerService } from '../node_modules/@univerjs/core/lib/types/services/user-manager/user-manager.service';
export { merge } from '../node_modules/@univerjs/core/lib/types/common/lodash';
export { Univer } from '../node_modules/@univerjs/core/lib/types/univer';