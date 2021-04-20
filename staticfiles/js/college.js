$('#Event').on('hide.bs.modal', function () {    
    EventDate =  $("#EventDate").val();    
    EventVenue =  $("#EventVenue").val();
    EventAgenda = $("#EventAgenda").val();
    $.post("/collegeEvent", {EventDate : EventDate,EventVenue: EventVenue, EventAgenda:EventAgenda })
    location.reload();
})

$('#Notice').on('hide.bs.modal', function () {    
    NoticeDate =  $("#NoticeDate").val();    
    NoticeContent = $("#NoticeContent").val();
    $.post("/collegeNotice", {NoticeDate:NoticeDate,NoticeContent:NoticeContent});
    location.reload();  
})