using UnityEngine;
using System.Drawing;//Point
using Emgu.CV;
using Emgu.CV.Util;//Vectors
using Emgu.CV.CvEnum;//Utility for constants
using Emgu.CV.Structure;
using System;
using System.Collections.Generic;

public class CameraCity : MonoBehaviour
{
    //-----private-----//
    private Mat imageMat;
    private Mat imageHSV = new Mat();
    private VectorOfVectorOfPoint contours;
    private VideoCapture fluxVideo;
    private Hsv seuilbasHsv;
    private Hsv seuilhautHsv;
    private Hsv seuilbasHsvBleu;
    private Hsv seuilhautHsvBleu;
    private List<RotatedRect> buildings;
    private List<Triangle2DF> ListTriangles = new List<Triangle2DF>();
    private List<GameObject> listBuilding =  new List<GameObject>();
    private GameObject goMire;


    //-----public-----//
    public Vector3 seuilBas;
    public Vector3 seuilHaut;
    public Vector3 seuilBasBleu;
    public Vector3 seuilHautBleu;
    public int Scale = 40;
    public List<GameObject> listTrees = new List<GameObject>();
    public GameObject Detection;


    void Start()
    {

        imageMat = new Mat();
        fluxVideo = new VideoCapture(0, VideoCapture.API.Any);
        fluxVideo.FlipHorizontal = true;
        fluxVideo.ImageGrabbed += ProcessFrame;
    }

    // Update is called once per frame
    void Update()
    {
        //setup HSV Color
        seuilbasHsv = new Hsv(seuilBas.x, seuilBas.y, seuilBas.z);
        seuilhautHsv = new Hsv(seuilHaut.x, seuilHaut.y, seuilHaut.z);

        seuilbasHsvBleu = new Hsv(seuilBasBleu.x, seuilBasBleu.y, seuilBasBleu.z);
        seuilhautHsvBleu = new Hsv(seuilBasBleu.x, seuilBasBleu.y, seuilBasBleu.z);

        fluxVideo.Grab();

        //converti
        Image<Gray, byte> imageSeuilLimit = Convert(seuilBas, seuilHaut);
        Image<Gray, byte> imageSeuilLimitBleu = Convert(seuilBasBleu, seuilHautBleu);
        Image<Gray, byte> imageSeuilLimitDilater = Convert(seuilBas, seuilHaut);
        //dilate pour affiner les trais
        var strutElement = CvInvoke.GetStructuringElement(ElementShape.Rectangle, new Size(5, 5), new Point(2, 2));
        CvInvoke.Dilate(imageSeuilLimitDilater, imageSeuilLimit, strutElement, new Point(2, 2), 1, BorderType.Default, new MCvScalar());

        var strutElementBlue = CvInvoke.GetStructuringElement(ElementShape.Rectangle, new Size(5, 5), new Point(2, 2));
        CvInvoke.Dilate(imageSeuilLimitBleu, imageSeuilLimitBleu, strutElementBlue, new Point(2, 2), 1, BorderType.Default, new MCvScalar());

        //Recognition building
        buildings = DrawRectangle(imageSeuilLimitBleu, "Arbre");
        //ListTriangles = DrawTriangle(imageSeuilLimit, "triangle");
        //CvInvoke.Imshow("Image seuile POV", imageSeuilLimit.Mat);
        CvInvoke.Imshow("Image seuile dilater", imageSeuilLimitDilater.Mat);
        CvInvoke.Imshow("Image", imageMat);
        CvInvoke.WaitKey(24);
    }

    private void OnDestroy()
    {
        fluxVideo.Dispose();
        CvInvoke.DestroyAllWindows();
    }

    //More FPS
    private void ProcessFrame(object sender, EventArgs e)
    {
        try
        {
            fluxVideo.Retrieve(imageMat, 0);
        }
        catch (Exception exception)
        {
            Debug.Log(exception.Message);
        }
    }

    //convert image in black and white
    Image<Gray, byte> Convert(Vector3 seuilb, Vector3 seuilh)
    {
        CvInvoke.CvtColor(imageMat, imageHSV, ColorConversion.Bgr2Hsv);
        CvInvoke.Blur(imageHSV, imageHSV, new Size(4, 4), new Point(1, 1));
        seuilbasHsv = new Hsv(seuilb.x, seuilb.y, seuilb.z);
        seuilhautHsv = new Hsv(seuilh.x, seuilh.y, seuilh.z);
        Image<Hsv, byte> imgConverti = imageHSV.ToImage<Hsv, byte>();
        Image<Gray, byte> imgseuil = imgConverti.InRange(seuilbasHsv, seuilhautHsv);
        return imgseuil;
    }

    //fonction pour dessiner les limits des obj et creer leur centroide
    List<RotatedRect> DrawRectangle(Image<Gray, byte> imageSeuil, String name)
    {
        List<RotatedRect> boxList = new List<RotatedRect>();
        contours = new VectorOfVectorOfPoint();
        Mat m = new Mat();
        CvInvoke.FindContours(imageSeuil, contours, m, Emgu.CV.CvEnum.RetrType.External, Emgu.CV.CvEnum.ChainApproxMethod.ChainApproxSimple);

        for (int i = 0; i < contours.Size; i++)
        {
            double perimeter = CvInvoke.ArcLength(contours[i], true);
            VectorOfPoint approx = new VectorOfPoint();
            CvInvoke.ApproxPolyDP(contours[i], approx, 0.04 * perimeter, true);
            if (CvInvoke.ContourArea(approx, false) > 250) //only consider contours with area greater than 250
            {
                if (approx.Size == 4)//The contour has 4 vertices, it is a rectangle
                {
                    bool isRectangle = true;
                    Point[] pts = approx.ToArray();
                    LineSegment2D[] edges = PointCollection.PolyLine(pts, true);

                    for (int j = 0; j < edges.Length; j++)
                    {
                        double angle = Math.Abs(
                            edges[(j + 1) % edges.Length].GetExteriorAngleDegree(edges[j]));
                        if (angle < 80 || angle > 100)
                        {
                            isRectangle = false;
                            break;
                        }
                    }
                    if (isRectangle) boxList.Add(CvInvoke.MinAreaRect(approx));
                }

                foreach (RotatedRect box in boxList)
                {
                    CvInvoke.Polylines(imageMat, Array.ConvertAll(box.GetVertices(), Point.Round), true,
                        new Bgr(System.Drawing.Color.Green).MCvScalar, 2);
                    var moments = CvInvoke.Moments(contours[i]);
                    int x = (int)(moments.M10 / moments.M00);
                    int y = (int)(moments.M01 / moments.M00);
                    CvInvoke.PutText(imageMat, name, new Point(x, y), Emgu.CV.CvEnum.FontFace.HersheySimplex, 0.5, new MCvScalar(0, 0, 255), 2);
                }
            }
        }

        return boxList;
    }

    List<Triangle2DF> DrawTriangle(Image<Gray, byte> imageSeuil, String name)
    {
        List<Triangle2DF> triangleList = new List<Triangle2DF>();
        contours = new VectorOfVectorOfPoint();
        Mat m = new Mat();

        CvInvoke.FindContours(imageSeuil, contours, m, Emgu.CV.CvEnum.RetrType.External, Emgu.CV.CvEnum.ChainApproxMethod.ChainApproxSimple);
        for (int i = 0; i < contours.Size; i++)
        {
            double perimeter = CvInvoke.ArcLength(contours[i], true);
            VectorOfPoint approx = new VectorOfPoint();
            CvInvoke.ApproxPolyDP(contours[i], approx, 0.04 * perimeter, true);
            if (CvInvoke.ContourArea(approx, false) > 250) //only consider contours with area greater than 250
            {
                if (approx.Size == 3) //The contour has 3 vertices, it is a triangle
                {
                    Point[] pts = approx.ToArray();
                    triangleList.Add(new Triangle2DF(
                        pts[0],
                        pts[1],
                        pts[2]
                    ));
                }
                //Draw on the image the recognition
                foreach (Triangle2DF triangle in triangleList)
                {
                    CvInvoke.Polylines(imageMat, Array.ConvertAll(triangle.GetVertices(), Point.Round),
                        true, new Bgr(System.Drawing.Color.DarkBlue).MCvScalar, 2);
                    var moments = CvInvoke.Moments(contours[i]);
                    int x = (int)(moments.M10 / moments.M00);
                    int y = (int)(moments.M01 / moments.M00);
                    CvInvoke.Circle(imageMat, new Point((int)triangle.V0.X, (int)triangle.V0.Y), 7, new MCvScalar(0, 0, 0), -1);
                    CvInvoke.PutText(imageMat, name, new Point(x, y), Emgu.CV.CvEnum.FontFace.HersheySimplex, 0.5, new MCvScalar(0, 0, 255), 2);
                }
            }
        }
        return triangleList;
    }

    public void CreateBuilding()
    {
        //Clear building
        ClearGameObject();

        for (int i = 0; i < buildings.Count; i++)
        {
            
            GameObject go = Instantiate(listTrees[UnityEngine.Random.Range(0,listTrees.Count)], new Vector3(Scale * buildings[i].Center.X / 600, 1, Scale * buildings[i].Center.Y / 600), Quaternion.identity);
            go.transform.localScale = new Vector3(Scale * buildings[i].Size.Width / 1000, 1, Scale * buildings[i].Size.Height / 1000);
            go.transform.Rotate(new Vector3(0,1,0), buildings[i].Angle);
            listBuilding.Add(go);
        }

        goMire = Instantiate(Detection, new Vector3(Scale * ListTriangles[0].Centeroid.X / 600, 1, Scale * ListTriangles[0].Centeroid.Y / 600), Quaternion.identity);
        goMire.name = "POV";
    }

    public void VisualizeBuilding()
    {
        Camera.main.transform.position = new Vector3(20, 20, -10);
        Camera.main.transform.rotation = Quaternion.Euler(40, 0, 0);
        Camera.main.GetComponent<SmoothCamera>().StartCameraMovment();
    }

    //Clear all gameObject captures
    public void ClearGameObject()
    {
        if (listBuilding.Count > 0)
        {
            for (int i = 0; i < listBuilding.Count; i++)
            {
                Destroy(listBuilding[i]);
            }
            listBuilding.Clear();
        }
        if (goMire!= null)
        {
            Destroy(goMire);
        }
    }
}
