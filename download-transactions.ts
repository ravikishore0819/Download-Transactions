import {
	Component,
	OnInit,
	OnDestroy,
	Inject,
	ViewChild,
	ElementRef,
} from "@angular/core";
import { Store } from "@ngrx/store";
import { Observable, Subscription } from "rxjs";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material";
import {
	GetDownloadTransactionsAction,
	GetLastTransactionsAction,
	selectDepositAccountDetails,
	AppState,
	DepositAccountDetails,
	LastTransactionsState,
	TransactionsState,
	ClearLastTransactionsAction,
} from "olb-lib";
import { lastDownloadTransactionDetails } from "projects/olb-lib/src/engines/download-transactions/download-transactions.selectors";
import { FormControl, Validators } from "@angular/forms";
import * as moment from "moment";

export interface DialogData {
	message: string;
	accountNumber: string;
}

export interface MatElementRef {
	value: string;
}

@Component({
	selector: "download-transactions-dialog",
	templateUrl: "download-transactions.html",
	styleUrls: ["./download-transactions.component.scss"],
})
export class DownloadTransactionsDialog implements OnInit, OnDestroy {
	constructor(
		public dialogRef: MatDialogRef<DownloadTransactionsDialog>,
		private store: Store<AppState>,
		private Store: Store<TransactionsState>,
		@Inject(MAT_DIALOG_DATA) public data: DialogData,
	) {}
	month = new FormControl("", [Validators.required]);
	months = [];
	minimumDate: Date;
	noShowMonth: Boolean = false;
	noShowFinancial: Boolean = false;
	noShowStartEnd: Boolean = false;
	checking: "";
	accountDetails$: Observable<DepositAccountDetails>;
	lastTransactionsDetails: LastTransactionsState;
	lastTransactionStartDate: String = "";
	lastTransactionEndDate: String = "";
	private lastTransactionsDetailsSubscription: Subscription;
	private activeTabIndex: Number = 0;
	@ViewChild("monthAndYear") monthAndYearRef: MatElementRef;
	@ViewChild("financialYear") financialYearRef: MatElementRef;
	@ViewChild("startDate") startDateRef: ElementRef;
	@ViewChild("endDate") endDateRef: ElementRef;
	onYesClick(): void {
		this.dialogRef.close(true);
	}
	close() {
		this.dialogRef.close();
	}
	ngOnInit() {
		this.accountDetails$ = this.store.select(selectDepositAccountDetails);
		this.lastTransactionsDetailsSubscription = this.store
			.select(lastDownloadTransactionDetails)
			.subscribe(data => {
				if ((data.fromDate && data.toDate) || data.periodStartDate) {
					this.lastTransactionsDetails = data;
					const {
						lastTxnDownloadStartDate,
						lastTxnDownloadEndDate,
						lastDownloadfileFormatCode,
						fromDate,
						periodStartDate,
						toDate,
					} = this.lastTransactionsDetails;
					this.lastTransactionStartDate = moment(
						lastTxnDownloadStartDate,
					).format("MM/DD/YYYY");
					this.lastTransactionEndDate = moment(lastTxnDownloadEndDate).format(
						"MM/DD/YYYY",
					);
					const pStartDate = periodStartDate ? moment(periodStartDate)
						.add(24, "months")
						.format("MMM YYYY") : moment().format("MMM YYYY");
					this.monthAndYearRef.value = this.months.includes(pStartDate) ? pStartDate : moment().format("MMM YYYY");
					this.financialYearRef.value = lastDownloadfileFormatCode;
					this.startDateRef.nativeElement.value = (fromDate ? moment(fromDate) : moment()).format(
						"MM/DD/YYYY",
					);
					this.endDateRef.nativeElement.value = (toDate ? moment(toDate) : moment()).format(
						"MM/DD/YYYY",
					);
				} else {
					this.monthAndYearRef.value = moment().format("MMM YYYY");
					this.startDateRef.nativeElement.value = moment().format("MM/DD/YYYY");
					this.endDateRef.nativeElement.value = moment().format("MM/DD/YYYY");
				}
			});
		let currentDate = new Date();
		currentDate.setFullYear(currentDate.getFullYear() - 2);

		let previousDate = new Date(currentDate);
		this.minimumDate = new Date(currentDate);
		let presentDate = new Date();

		let durationBetweenYears = presentDate.getFullYear() - previousDate.getFullYear();
		let durationBetweenMonths = presentDate.getMonth() - previousDate.getMonth();

		let durationInMonths = durationBetweenYears * 12 + durationBetweenMonths;

		for (let i = 0; i < durationInMonths; i++) {
			if (i == 0) {
				previousDate.setMonth(previousDate.getMonth());
			} else {
				previousDate.setMonth(previousDate.getMonth() + 1);
			}
			this.months[i] = moment(previousDate).format("MMM YYYY");
		}

		this.months = this.months.reverse();
		this.Store.dispatch(new ClearLastTransactionsAction());
		this.Store.dispatch(
			new GetLastTransactionsAction({
				accountId: this.data.message,
			}),
		);
	}

	ngOnDestroy() {
		this.lastTransactionsDetailsSubscription.unsubscribe();
		this.store.dispatch(new ClearLastTransactionsAction());
	}

	downloadTransaction(monthAndYear, financialYear, fromDate, tillDate) {
		// console.log('dates- ', fromDate);
		const accountId = this.data.message;
		const accountNumber = this.data.accountNumber;
		const startDate = this.activeTabIndex === 1 ? fromDate : null;
		const endDate = this.activeTabIndex === 1 ? tillDate : null;
		const fileFormatCode = this.financialYearRef.value;
		const selectedMonth = this.activeTabIndex === 0 ? monthAndYear : moment(fromDate).format("MMM YYYY");
		const monthSelectionType = true;
		if (
			(this.activeTabIndex === 0 && monthAndYear && fileFormatCode) ||
			(this.activeTabIndex === 1 && fromDate && tillDate && fileFormatCode)
		) {
			this.noShowFinancial = false;
			this.noShowMonth = false;
			this.noShowStartEnd = false;
			this.Store.dispatch(
				new GetDownloadTransactionsAction({
					accountId,
					accountNumber,
					fileFormatCode,
					startDate,
					endDate,
					monthSelectionType,
					selectedMonth,
				}),
			);
		} else {
			this.noShowFinancial = financialYear ? false : true;
			if (this.activeTabIndex === 0) {
				this.noShowMonth = monthAndYear ? false : true;
				this.noShowStartEnd = false;
			} else if (this.activeTabIndex === 1) {
				this.noShowMonth = false;
			  this.noShowStartEnd = startDate && endDate ? false : true;
			}
		}
	}

	tabChanged($event) {
		this.activeTabIndex = $event.index;
	}
}
